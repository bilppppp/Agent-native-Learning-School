import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProgressStore } from "./store";

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

function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code: unknown }).code === "ENOENT"
	);
}

function progressDir(): string {
	const raw = process.env.PROGRESS_DIR;
	if (raw === undefined || raw === "") {
		return path.resolve(process.cwd(), ".school-data", "progress");
	}
	return path.resolve(raw);
}

function relativePathForKey(key: string): string {
	const match = /^([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/.exec(key);
	if (!match) {
		throw new Error(`Invalid progress key: ${JSON.stringify(key)}`);
	}
	return path.join(match[1], `${match[2]}.json`);
}

function resolvedFileForKey(key: string): string {
	const root = progressDir();
	const resolvedRoot = path.resolve(root);
	const resolved = path.resolve(resolvedRoot, relativePathForKey(key));
	const rootPrefix = resolvedRoot.endsWith(path.sep)
		? resolvedRoot
		: resolvedRoot + path.sep;
	if (resolved !== resolvedRoot && !resolved.startsWith(rootPrefix)) {
		throw new Error(`Invalid progress key: ${JSON.stringify(key)}`);
	}
	return resolved;
}

async function readText(key: string): Promise<string | null> {
	try {
		return await readFile(resolvedFileForKey(key), "utf8");
	} catch (error) {
		if (isNotFound(error)) return null;
		throw error;
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function corruptRecord(key: string): Error {
	return new Error(`Corrupt progress record for ${JSON.stringify(key)}`);
}

export function createNodeProgressStore(): ProgressStore {
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
			const file = resolvedFileForKey(key);
			await mkdir(path.dirname(file), { recursive: true });
			const temp = `${file}.${randomBytes(8).toString("hex")}.tmp`;
			await writeFile(temp, value, "utf8");
			await rename(temp, file);
		},
		withLock(key, operation) {
			return withProcessLock(key, operation);
		},
	} as ProgressStore;
}
