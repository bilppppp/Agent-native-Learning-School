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

export async function createDevProgressStore(): Promise<ProgressStore> {
	const { env } = await import("cloudflare:workers");
	const kv = env.PROGRESS;
	return {
		get(key: string, format?: "json") {
			if (format === "json") {
				return kv.get(key, "json");
			}
			return kv.get(key);
		},
		put(key: string, value: string) {
			return kv.put(key, value);
		},
		withLock(key, operation) {
			return withProcessLock(key, operation);
		},
	} as ProgressStore;
}
