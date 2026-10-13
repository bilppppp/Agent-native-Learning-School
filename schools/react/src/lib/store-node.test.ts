import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createStudent,
	getProgress,
	markLessonComplete,
	updateProfile,
} from "./progress";
import { getProgressStore } from "./store";

const originalDeployTarget = process.env.DEPLOY_TARGET;
const originalProgressDir = process.env.PROGRESS_DIR;

function restoreEnv() {
	if (originalDeployTarget === undefined) {
		delete process.env.DEPLOY_TARGET;
	} else {
		process.env.DEPLOY_TARGET = originalDeployTarget;
	}
	if (originalProgressDir === undefined) {
		delete process.env.PROGRESS_DIR;
	} else {
		process.env.PROGRESS_DIR = originalProgressDir;
	}
}

describe("node progress files", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(path.join(os.tmpdir(), "school-progress-"));
		process.env.DEPLOY_TARGET = "node";
		process.env.PROGRESS_DIR = dir;
	});

	afterEach(async () => {
		restoreEnv();
		await rm(dir, { recursive: true, force: true });
	});

	it("returns null when the student file is missing", async () => {
		const store = await getProgressStore();
		expect(await store.get("student:nobody-here-0000")).toBeNull();
		expect(await store.get("student:nobody-here-0000", "json")).toBeNull();
	});

	it("throws on empty files and does not let createStudent replace them", async () => {
		const file = path.join(dir, "student", "empty-record-1000.json");
		await mkdir(path.dirname(file), { recursive: true });
		await writeFile(file, "", "utf8");
		const store = await getProgressStore();
		await expect(
			store.get("student:empty-record-1000", "json"),
		).rejects.toThrow();
		await expect(createStudent("empty-record-1000")).rejects.toThrow();
		expect(await readFile(file, "utf8")).toBe("");
	});

	it.each([
		["null", "null-record-2000"],
		["false", "false-record-3000"],
		["0", "zero-record-4000"],
	] as const)(
		"throws when JSON is %s and does not let createStudent replace it",
		async (content, studentId) => {
			const file = path.join(dir, "student", `${studentId}.json`);
			await mkdir(path.dirname(file), { recursive: true });
			await writeFile(file, content, "utf8");
			const store = await getProgressStore();
			await expect(store.get(`student:${studentId}`, "json")).rejects.toThrow();
			expect(await createStudent(studentId)).toBeNull();
			expect(await readFile(file, "utf8")).toBe(content);
		},
	);

	it("throws when stored JSON is corrupt", async () => {
		const studentDir = path.join(dir, "student");
		await mkdir(studentDir, { recursive: true });
		await writeFile(
			path.join(studentDir, "corrupt-user-1111.json"),
			"{not-json",
			"utf8",
		);
		const store = await getProgressStore();
		await expect(
			store.get("student:corrupt-user-1111", "json"),
		).rejects.toThrow();
		expect(await store.get("student:corrupt-user-1111")).toBe("{not-json");
	});

	it("writes through a temp file then makes the official file readable", async () => {
		const store = await getProgressStore();
		await store.put("student:atomic-writer-2222", '{"ok":true}');
		const official = path.join(dir, "student", "atomic-writer-2222.json");
		expect(await readFile(official, "utf8")).toBe('{"ok":true}');
		expect(await store.get("student:atomic-writer-2222")).toBe('{"ok":true}');
		expect(await store.get<{ ok: boolean }>("student:atomic-writer-2222", "json")).toEqual(
			{ ok: true },
		);
		const leftover = (await readdir(path.join(dir, "student"))).filter((name) =>
			name.endsWith(".tmp"),
		);
		expect(leftover).toEqual([]);
	});

	it("rejects path traversal in the logical key", async () => {
		const store = await getProgressStore();
		await expect(store.get("student:../secret")).rejects.toThrow(
			/Invalid progress key/,
		);
		await expect(store.put("student:foo/bar", "x")).rejects.toThrow(
			/Invalid progress key/,
		);
	});

	it("keeps both lessons and the profile when they update at once", async () => {
		const studentId = "concurrent-learner-1234";
		expect(await createStudent(studentId)).not.toBeNull();

		await Promise.all([
			markLessonComplete(studentId, "enrollment"),
			markLessonComplete(studentId, "install-opencode"),
			updateProfile(studentId, { teachingMode: "immersive" }),
		]);

		const progress = await getProgress(studentId);
		expect(progress?.completedLessons.map((lesson) => lesson.slug).sort()).toEqual(
			["enrollment", "install-opencode"],
		);
		expect(progress?.profile?.teachingMode).toBe("immersive");
	});
});
