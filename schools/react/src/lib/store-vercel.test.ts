import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProgressStore, ProgressStoreUnavailableError } from "./store";

const { blobs, blobGet, blobPut } = vi.hoisted(() => {
	const blobs = new Map<string, string>();
	const blobGet = vi.fn();
	const blobPut = vi.fn();
	return { blobs, blobGet, blobPut };
});

vi.mock("@vercel/blob", () => ({
	get: blobGet,
	put: blobPut,
}));

const originalDeployTarget = process.env.DEPLOY_TARGET;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

function restoreEnv() {
	if (originalDeployTarget === undefined) {
		delete process.env.DEPLOY_TARGET;
	} else {
		process.env.DEPLOY_TARGET = originalDeployTarget;
	}
	if (originalBlobToken === undefined) {
		delete process.env.BLOB_READ_WRITE_TOKEN;
	} else {
		process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
	}
}

describe("vercel blob progress store", () => {
	beforeEach(() => {
		blobs.clear();
		blobGet.mockReset();
		blobPut.mockReset();
		process.env.DEPLOY_TARGET = "vercel";
		process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_test_token";
		blobGet.mockImplementation(async (pathname: string, options: { access?: string; useCache?: boolean }) => {
			expect(options.access).toBe("private");
			expect(options.useCache).toBe(false);
			const text = blobs.get(pathname);
			if (text === undefined) return null;
			return {
				stream: new Blob([text]).stream(),
			};
		});
		blobPut.mockImplementation(
			async (
				pathname: string,
				value: string,
				options: { access?: string; allowOverwrite?: boolean },
			) => {
				expect(options.access).toBe("private");
				expect(options.allowOverwrite).toBe(true);
				blobs.set(pathname, value);
			},
		);
	});

	afterEach(() => {
		restoreEnv();
	});

	it("stores student records at kv/student/<id>.json", async () => {
		const store = await getProgressStore();
		await store.put("student:curious-explorer-2019", '{"ok":true}');
		expect(blobPut).toHaveBeenCalledWith(
			"kv/student/curious-explorer-2019.json",
			'{"ok":true}',
			expect.objectContaining({
				access: "private",
				allowOverwrite: true,
				addRandomSuffix: false,
			}),
		);
		expect(await store.get("student:curious-explorer-2019")).toBe('{"ok":true}');
		expect(
			await store.get<{ ok: boolean }>("student:curious-explorer-2019", "json"),
		).toEqual({ ok: true });
	});

	it("returns null when get returns null for a missing blob", async () => {
		const store = await getProgressStore();
		expect(await store.get("student:nobody-here-0000")).toBeNull();
		expect(await store.get("student:nobody-here-0000", "json")).toBeNull();
		await expect(blobGet.mock.results[0]?.value).resolves.toBeNull();
	});

	it("treats stream read failures as unavailable", async () => {
		blobGet.mockImplementationOnce(async () => ({
			stream: new ReadableStream({
				start(controller) {
					controller.error(new Error("blob stream failed"));
				},
			}),
		}));
		const store = await getProgressStore();
		await expect(store.get("student:curious-explorer-2019")).rejects.toBeInstanceOf(
			ProgressStoreUnavailableError,
		);
	});

	it("throws on corrupt JSON instead of treating it as missing", async () => {
		blobs.set("kv/student/corrupt-user-1111.json", "null");
		const store = await getProgressStore();
		await expect(
			store.get("student:corrupt-user-1111", "json"),
		).rejects.toThrow(/Corrupt progress record/);
	});
});
