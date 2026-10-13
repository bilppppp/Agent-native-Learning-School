// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createStudent,
	getProgress,
	markExerciseComplete,
	markExerciseIncomplete,
	markLessonComplete,
	markLessonIncomplete,
	resetProgress,
} from "./progress";
import { getProgressStore, type ProgressStore } from "./store";

vi.mock("./store", () => ({
	getProgressStore: vi.fn(),
}));

function createMockStore(): ProgressStore {
	const data = new Map<string, string>();
	const chains = new Map<string, Promise<void>>();
	return {
		get(key: string, format?: "json") {
			const val = data.get(key) ?? null;
			if (val !== null && format === "json") return Promise.resolve(JSON.parse(val));
			return Promise.resolve(val);
		},
		put(key: string, value: string) {
			data.set(key, value);
			return Promise.resolve();
		},
		withLock(key, operation) {
			const previous = chains.get(key) ?? Promise.resolve();
			const current = previous.then(operation, operation);
			chains.set(
				key,
				current.then(
					() => undefined,
					() => undefined,
				),
			);
			return current;
		},
	} as ProgressStore;
}

describe("createStudent", () => {
	let store: ProgressStore;

	beforeEach(() => {
		store = createMockStore();
		vi.mocked(getProgressStore).mockResolvedValue(store);
	});

	it("creates a new student with empty progress", async () => {
		const progress = await createStudent("curious-hacker-1234");

		expect(progress).not.toBeNull();
		expect(progress?.completedLessons).toEqual([]);
		expect(progress?.createdAt).toBeTruthy();
		expect(progress?.updatedAt).toBeTruthy();
		expect(progress?.deviceId).toBeUndefined();
		expect(await store.get("student:curious-hacker-1234")).toEqual(
			expect.any(String),
		);
	});

	it("stores deviceId when provided", async () => {
		const deviceId = "550e8400-e29b-41d4-a716-446655440000";
		const progress = await createStudent("crafty-tinkerer-7890", deviceId);

		expect(progress?.deviceId).toBe(deviceId);
		const stored = JSON.parse(
			(await store.get("student:crafty-tinkerer-7890")) as string,
		);
		expect(stored.deviceId).toBe(deviceId);
	});

	it("omits deviceId from stored record when not provided", async () => {
		await createStudent("vibing-operator-1111");
		const stored = JSON.parse(
			(await store.get("student:vibing-operator-1111")) as string,
		);
		expect(stored.deviceId).toBeUndefined();
	});

	it("does not overwrite an existing student", async () => {
		const first = await createStudent("keeper-id-1000", "device-one");
		const second = await createStudent("keeper-id-1000", "device-two");

		expect(first?.deviceId).toBe("device-one");
		expect(second).toBeNull();
		const stored = await getProgress("keeper-id-1000");
		expect(stored?.deviceId).toBe("device-one");
	});

	it("does not let concurrent creates overwrite the same id", async () => {
		const inner = store;
		const delayed: ProgressStore = {
			async get(key: string, format?: "json") {
				await new Promise((resolve) => setTimeout(resolve, 20));
				if (format === "json") return inner.get(key, "json");
				return inner.get(key);
			},
			put: (key, value) => inner.put(key, value),
			withLock: (key, operation) => inner.withLock(key, operation),
		};
		vi.mocked(getProgressStore).mockResolvedValue(delayed);

		const [first, second] = await Promise.all([
			createStudent("racy-student-4242", "device-one"),
			createStudent("racy-student-4242", "device-two"),
		]);

		const created = [first, second].filter((entry) => entry !== null);
		expect(created).toHaveLength(1);
		const stored = await getProgress("racy-student-4242");
		expect(stored?.deviceId).toBe(created[0]?.deviceId);
		expect(
			stored?.deviceId === "device-one" || stored?.deviceId === "device-two",
		).toBe(true);
	});
});

describe("getProgress", () => {
	let store: ProgressStore;

	beforeEach(() => {
		store = createMockStore();
		vi.mocked(getProgressStore).mockResolvedValue(store);
	});

	it("returns null for a non-existent student", async () => {
		const result = await getProgress("nobody-here-0000");
		expect(result).toBeNull();
	});

	it("returns progress for an existing student", async () => {
		await createStudent("sharp-coder-5678");
		const result = await getProgress("sharp-coder-5678");

		expect(result).not.toBeNull();
		expect(result?.completedLessons).toEqual([]);
	});

	it("normalizes legacy string-based completedLessons", async () => {
		const legacy = {
			completedLessons: ["enrollment", "install-opencode"],
			createdAt: "2025-01-01T00:00:00.000Z",
			updatedAt: "2025-06-15T00:00:00.000Z",
		};
		await store.put("student:legacy-user-1111", JSON.stringify(legacy));

		const result = await getProgress("legacy-user-1111");
		expect(result).not.toBeNull();
		expect(result?.completedLessons).toHaveLength(2);
		expect(result?.completedLessons[0]).toEqual({
			slug: "enrollment",
			completedAt: "2025-06-15T00:00:00.000Z",
			source: "browser",
		});
		expect(result?.completedLessons[1]).toEqual({
			slug: "install-opencode",
			completedAt: "2025-06-15T00:00:00.000Z",
			source: "browser",
		});
	});
});

describe("markLessonComplete", () => {
	beforeEach(() => {
		vi.mocked(getProgressStore).mockResolvedValue(createMockStore());
	});

	it("returns null for a non-existent student", async () => {
		const result = await markLessonComplete("nobody-here-0000", "enrollment");
		expect(result).toBeNull();
	});

	it("marks a lesson complete", async () => {
		await createStudent("clever-maker-3333");
		const result = await markLessonComplete("clever-maker-3333", "enrollment");

		expect(result).not.toBeNull();
		expect(result?.completedLessons).toHaveLength(1);
		expect(result?.completedLessons[0].slug).toBe("enrollment");
		expect(result?.completedLessons[0].source).toBe("browser");
	});

	it("accepts a source parameter", async () => {
		await createStudent("nimble-wizard-4444");
		const result = await markLessonComplete(
			"nimble-wizard-4444",
			"install-opencode",
			"agent",
		);

		expect(result?.completedLessons[0].source).toBe("agent");
	});

	it("is idempotent — marking the same lesson twice does not duplicate", async () => {
		await createStudent("smooth-builder-5555");
		await markLessonComplete("smooth-builder-5555", "enrollment");
		const result = await markLessonComplete("smooth-builder-5555", "enrollment");

		expect(result?.completedLessons).toHaveLength(1);
	});

	it("can mark multiple different lessons", async () => {
		await createStudent("lucky-scholar-6666");
		await markLessonComplete("lucky-scholar-6666", "enrollment");
		const result = await markLessonComplete(
			"lucky-scholar-6666",
			"install-opencode",
		);

		expect(result?.completedLessons).toHaveLength(2);
		expect(result?.completedLessons.map((l) => l.slug)).toEqual([
			"enrollment",
			"install-opencode",
		]);
	});
});

describe("markLessonIncomplete", () => {
	beforeEach(() => {
		vi.mocked(getProgressStore).mockResolvedValue(createMockStore());
	});

	it("returns null for a non-existent student", async () => {
		const result = await markLessonIncomplete("nobody-here-0000", "enrollment");
		expect(result).toBeNull();
	});

	it("removes a completed lesson", async () => {
		await createStudent("eager-learner-1111");
		await markLessonComplete("eager-learner-1111", "enrollment");
		await markLessonComplete("eager-learner-1111", "installation");

		const result = await markLessonIncomplete(
			"eager-learner-1111",
			"enrollment",
		);

		expect(result?.completedLessons).toHaveLength(1);
		expect(result?.completedLessons[0].slug).toBe("installation");
	});

	it("is a no-op for a lesson that was not completed", async () => {
		await createStudent("calm-coder-2222");
		await markLessonComplete("calm-coder-2222", "enrollment");

		const result = await markLessonIncomplete(
			"calm-coder-2222",
			"installation",
		);

		expect(result?.completedLessons).toHaveLength(1);
		expect(result?.completedLessons[0].slug).toBe("enrollment");
	});
});

describe("markExerciseIncomplete", () => {
	beforeEach(() => {
		vi.mocked(getProgressStore).mockResolvedValue(createMockStore());
	});

	it("returns null for a non-existent student", async () => {
		const result = await markExerciseIncomplete(
			"nobody-here-0000",
			"build-a-website",
		);
		expect(result).toBeNull();
	});

	it("removes a completed exercise", async () => {
		await createStudent("brave-builder-3333");
		await markExerciseComplete("brave-builder-3333", "build-a-website");
		await markExerciseComplete("brave-builder-3333", "edit-videos");

		const result = await markExerciseIncomplete(
			"brave-builder-3333",
			"build-a-website",
		);

		expect(result?.completedExercises).toHaveLength(1);
		expect(result?.completedExercises[0].slug).toBe("edit-videos");
	});

	it("is a no-op for an exercise that was not completed", async () => {
		await createStudent("quick-thinker-4444");

		const result = await markExerciseIncomplete(
			"quick-thinker-4444",
			"build-a-website",
		);

		expect(result?.completedExercises).toHaveLength(0);
	});
});

describe("resetProgress", () => {
	let store: ProgressStore;

	beforeEach(() => {
		store = createMockStore();
		vi.mocked(getProgressStore).mockResolvedValue(store);
	});

	it("returns null for a non-existent student", async () => {
		const result = await resetProgress("nobody-here-0000");
		expect(result).toBeNull();
	});

	it("clears all lessons and exercises", async () => {
		await createStudent("fresh-start-5555");
		await markLessonComplete("fresh-start-5555", "enrollment");
		await markLessonComplete("fresh-start-5555", "installation");
		await markExerciseComplete("fresh-start-5555", "build-a-website");

		const result = await resetProgress("fresh-start-5555");

		expect(result?.completedLessons).toEqual([]);
		expect(result?.completedExercises).toEqual([]);
	});

	it("preserves profile, createdAt, and deviceId", async () => {
		const deviceId = "550e8400-e29b-41d4-a716-446655440000";
		await createStudent("keeper-of-data-6666", deviceId);
		await markLessonComplete("keeper-of-data-6666", "enrollment");

		// Manually set a profile on the record
		const progress = await getProgress("keeper-of-data-6666");
		const stored = {
			...progress,
			profile: { codingExperience: "builder" as const },
		};
		await store.put("student:keeper-of-data-6666", JSON.stringify(stored));

		const result = await resetProgress("keeper-of-data-6666");

		expect(result?.completedLessons).toEqual([]);
		expect(result?.profile?.codingExperience).toBe("builder");
		expect(result?.createdAt).toBe(progress?.createdAt);
		expect(result?.deviceId).toBe(deviceId);
	});
});
