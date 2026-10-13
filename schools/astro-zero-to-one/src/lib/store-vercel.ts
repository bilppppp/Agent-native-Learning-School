import { get, put } from "@vercel/blob";
import {
	ProgressStoreUnavailableError,
	type ProgressStore,
} from "./store";

const lockTails = new Map<string, Promise<void>>();

function withProcessLock<T>(
	key: string,
	operation: () => Promise<T>,
): Promise<T> {
	const previous = lockTails.get(key) ?? Promise.resolve();
	const current = previous.then(operation, operation);
	lockTails.set(
		key,
		current.then(
			() => undefined,
			() => undefined,
		),
	);
	return current;
}

function relativePathForKey(key: string): string {
	const match = /^([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/.exec(key);
	if (!match) {
		throw new Error(`Invalid progress key: ${JSON.stringify(key)}`);
	}
	return `kv/${match[1]}/${match[2]}.json`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function corruptRecord(key: string): Error {
	return new Error(`Corrupt progress record for ${JSON.stringify(key)}`);
}

function isBlobNotFound(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const value = error as {
		status?: number;
		statusCode?: number;
		name?: string;
		message?: string;
	};
	if (value.status === 404 || value.statusCode === 404) return true;
	if (value.name === "BlobNotFoundError") return true;
	return typeof value.message === "string" && /not found/i.test(value.message);
}

async function readText(key: string): Promise<string | null> {
	const pathname = relativePathForKey(key);
	let result: {
		stream?: ReadableStream<Uint8Array> | null;
	} | null;
	try {
		result = await get(pathname, {
			access: "private",
			useCache: false,
		});
	} catch (error) {
		if (isBlobNotFound(error)) return null;
		throw new ProgressStoreUnavailableError();
	}
	if (result == null) return null;
	if (!result.stream) return null;
	try {
		return await new Response(result.stream).text();
	} catch {
		throw new ProgressStoreUnavailableError();
	}
}

export function createVercelProgressStore(): ProgressStore {
	return {
		get(key: string, format?: "json") {
			return (async () => {
				const text = await readText(key);
				if (text === null) return null;
				if (text.trim() === "") throw corruptRecord(key);
				if (format === "json") {
					const parsed: unknown = JSON.parse(text);
					if (!isPlainObject(parsed)) throw corruptRecord(key);
					return parsed;
				}
				return text;
			})();
		},
		async put(key: string, value: string) {
			try {
				await put(relativePathForKey(key), value, {
					access: "private",
					addRandomSuffix: false,
					allowOverwrite: true,
					contentType: "application/json",
				});
			} catch {
				throw new ProgressStoreUnavailableError();
			}
		},
		withLock(key, operation) {
			return withProcessLock(key, operation);
		},
	} as ProgressStore;
}
