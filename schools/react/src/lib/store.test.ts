import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getProgressStore,
	ProgressStoreUnavailableError,
	progressUnavailableResponse,
} from "./store";

const { mockKv, kvData } = vi.hoisted(() => {
	const kvData = new Map<string, string>();
	const mockKv = {
		get: vi.fn(async (key: string, format?: string) => {
			const val = kvData.get(key) ?? null;
			if (val !== null && format === "json") return JSON.parse(val);
			return val;
		}),
		put: vi.fn(async (key: string, value: string) => {
			kvData.set(key, value);
		}),
	};
	return { mockKv, kvData };
});

vi.mock("cloudflare:workers", () => ({
	env: { PROGRESS: mockKv },
}));

const originalDeployTarget = process.env.DEPLOY_TARGET;
const originalProgressDir = process.env.PROGRESS_DIR;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

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
	if (originalBlobToken === undefined) {
		delete process.env.BLOB_READ_WRITE_TOKEN;
	} else {
		process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
	}
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("getProgressStore", () => {
	beforeEach(() => {
		kvData.clear();
		mockKv.get.mockClear();
		mockKv.put.mockClear();
		restoreEnv();
	});

	afterEach(() => {
		restoreEnv();
	});

	it("treats an unset DEPLOY_TARGET as dev and uses local KV keys", async () => {
		delete process.env.DEPLOY_TARGET;
		const store = await getProgressStore();
		await store.put(
			"student:curious-explorer-2019",
			JSON.stringify({ ok: true }),
		);
		expect(await store.get("student:curious-explorer-2019")).toBe(
			JSON.stringify({ ok: true }),
		);
		expect(
			await store.get<{ ok: boolean }>("student:curious-explorer-2019", "json"),
		).toEqual({ ok: true });
		expect(mockKv.put).toHaveBeenCalledWith(
			"student:curious-explorer-2019",
			expect.any(String),
		);
	});

	it("treats an empty DEPLOY_TARGET as dev", async () => {
		process.env.DEPLOY_TARGET = "";
		const store = await getProgressStore();
		expect(await store.get("student:missing-student-0000")).toBeNull();
		expect(await store.get("student:missing-student-0000", "json")).toBeNull();
	});

	it("uses the local KV backend when DEPLOY_TARGET is dev", async () => {
		process.env.DEPLOY_TARGET = "dev";
		const store = await getProgressStore();
		await store.put("student:bright-wizard-1000", '{"n":1}');
		expect(kvData.get("student:bright-wizard-1000")).toBe('{"n":1}');
	});

	it("keeps using KV when PROGRESS_DIR is set but DEPLOY_TARGET is unset", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "school-progress-"));
		try {
			delete process.env.DEPLOY_TARGET;
			process.env.PROGRESS_DIR = dir;
			const store = await getProgressStore();
			await store.put("student:curious-explorer-2019", '{"ok":true}');
			expect(mockKv.put).toHaveBeenCalledWith(
				"student:curious-explorer-2019",
				'{"ok":true}',
			);
			expect(await readdir(dir)).toEqual([]);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it("keeps using KV when PROGRESS_DIR is set and DEPLOY_TARGET is dev", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "school-progress-"));
		try {
			process.env.DEPLOY_TARGET = "dev";
			process.env.PROGRESS_DIR = dir;
			const store = await getProgressStore();
			await store.put("student:bright-wizard-1000", '{"n":1}');
			expect(kvData.get("student:bright-wizard-1000")).toBe('{"n":1}');
			expect(await readdir(dir)).toEqual([]);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it("rejects an illegal DEPLOY_TARGET and names the value", async () => {
		process.env.DEPLOY_TARGET = "cloudflare";
		await expect(getProgressStore()).rejects.toThrow(
			'Invalid DEPLOY_TARGET: "cloudflare"',
		);
		expect(mockKv.get).not.toHaveBeenCalled();
		expect(mockKv.put).not.toHaveBeenCalled();
	});

	it("does not fall back to KV when DEPLOY_TARGET is node", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "school-progress-"));
		try {
			process.env.DEPLOY_TARGET = "node";
			process.env.PROGRESS_DIR = dir;
			const store = await getProgressStore();
			expect(await store.get("student:missing-student-0000")).toBeNull();
			expect(mockKv.get).not.toHaveBeenCalled();
			expect(mockKv.put).not.toHaveBeenCalled();
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it("keeps using KV when a Blob token is set but DEPLOY_TARGET is unset", async () => {
		delete process.env.DEPLOY_TARGET;
		process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_test_token";
		const store = await getProgressStore();
		await store.put("student:curious-explorer-2019", '{"ok":true}');
		expect(mockKv.put).toHaveBeenCalledWith(
			"student:curious-explorer-2019",
			'{"ok":true}',
		);
	});

	it("keeps using KV when a Blob token is set and DEPLOY_TARGET is dev", async () => {
		process.env.DEPLOY_TARGET = "dev";
		process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_test_token";
		const store = await getProgressStore();
		await store.put("student:bright-wizard-1000", '{"n":1}');
		expect(kvData.get("student:bright-wizard-1000")).toBe('{"n":1}');
	});

	it("does not fall back to KV when DEPLOY_TARGET is vercel without a token", async () => {
		process.env.DEPLOY_TARGET = "vercel";
		delete process.env.BLOB_READ_WRITE_TOKEN;
		await expect(getProgressStore()).rejects.toBeInstanceOf(
			ProgressStoreUnavailableError,
		);
		expect(mockKv.get).not.toHaveBeenCalled();
		expect(mockKv.put).not.toHaveBeenCalled();
	});
});

describe("progressUnavailableResponse", () => {
	it("returns 503 with CORS and no-store", async () => {
		const response = progressUnavailableResponse({
			"Access-Control-Allow-Origin": "*",
		});
		expect(response.status).toBe(503);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(await response.json()).toEqual({
			error: "Progress store unavailable",
		});
	});
});

describe("dev withLock", () => {
	beforeEach(() => {
		kvData.clear();
		mockKv.get.mockClear();
		mockKv.put.mockClear();
		process.env.DEPLOY_TARGET = "dev";
	});

	afterEach(() => {
		restoreEnv();
	});

	it("serializes read-modify-write on the same key", async () => {
		const store = await getProgressStore();
		const key = "student:serial-writer-4242";
		await store.put(key, JSON.stringify({ count: 0 }));

		await Promise.all([
			store.withLock(key, async () => {
				const raw = await store.get<{ count: number }>(key, "json");
				await wait(20);
				await store.put(key, JSON.stringify({ count: (raw?.count ?? 0) + 1 }));
			}),
			store.withLock(key, async () => {
				const raw = await store.get<{ count: number }>(key, "json");
				await wait(20);
				await store.put(key, JSON.stringify({ count: (raw?.count ?? 0) + 1 }));
			}),
		]);

		expect(await store.get<{ count: number }>(key, "json")).toEqual({
			count: 2,
		});
	});
});
