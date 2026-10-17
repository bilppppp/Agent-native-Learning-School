import { env } from "cloudflare:workers";
import {
	ProgressStoreUnavailableError,
	type ProgressStore,
} from "./store";

const lockTails = new Map<string, Promise<void>>();

interface ProgressObject {
	text(): Promise<string>;
}

interface ProgressBucket {
	get(key: string): Promise<ProgressObject | null>;
	put(
		key: string,
		value: string,
		options?: { httpMetadata?: { contentType?: string } },
	): Promise<unknown>;
}

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

function reportStoreFailure(error: unknown): ProgressStoreUnavailableError {
	const name = error instanceof Error ? error.name : "Error";
	const message = error instanceof Error ? error.message : "";
	console.error(`progress-store ${name}: ${message.slice(0, 200)}`);
	return new ProgressStoreUnavailableError();
}

function bucket(): ProgressBucket {
	const value = (env as { PROGRESS_BUCKET?: ProgressBucket }).PROGRESS_BUCKET;
	if (!value) throw new ProgressStoreUnavailableError();
	return value;
}

async function readText(key: string): Promise<string | null> {
	let object: ProgressObject | null;
	try {
		object = await bucket().get(relativePathForKey(key));
	} catch (error) {
		if (error instanceof ProgressStoreUnavailableError) throw error;
		throw reportStoreFailure(error);
	}
	if (object == null) return null;
	try {
		return await object.text();
	} catch (error) {
		throw reportStoreFailure(error);
	}
}

export function createR2ProgressStore(): ProgressStore {
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
				await bucket().put(relativePathForKey(key), value, {
					httpMetadata: { contentType: "application/json" },
				});
			} catch (error) {
				if (error instanceof ProgressStoreUnavailableError) throw error;
				throw reportStoreFailure(error);
			}
		},
		withLock(key, operation) {
			return withProcessLock(key, operation);
		},
	};
}
