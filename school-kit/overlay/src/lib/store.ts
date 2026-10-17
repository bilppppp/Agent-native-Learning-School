import { resolveDeployTarget } from "./deploy-target";

export interface ProgressStore {
	get(key: string): Promise<string | null>;
	get<T>(key: string, format: "json"): Promise<T | null>;
	put(key: string, value: string): Promise<void>;
	withLock<T>(key: string, operation: () => Promise<T>): Promise<T>;
}

export class ProgressStoreUnavailableError extends Error {
	constructor() {
		super("Progress store unavailable");
		this.name = "ProgressStoreUnavailableError";
	}
}

function buildTarget(): string | undefined {
	return import.meta.env.SCHOOL_DEPLOY_TARGET;
}

function readEnv(name: string): string | undefined {
	const value = process.env[name];
	return typeof value === "string" && value !== "" ? value : undefined;
}

function blobConfigMissing(): boolean {
	return (
		readEnv("BLOB_STORE_ID") === undefined &&
		readEnv("BLOB_READ_WRITE_TOKEN") === undefined
	);
}

export function progressUnavailableResponse(
	corsHeaders: Record<string, string>,
): Response {
	return new Response(JSON.stringify({ error: "Progress store unavailable" }), {
		status: 503,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
			...corsHeaders,
		},
	});
}

export async function runWithProgressStore(
	corsHeaders: Record<string, string>,
	operation: () => Promise<Response>,
): Promise<Response> {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof ProgressStoreUnavailableError) {
			return progressUnavailableResponse(corsHeaders);
		}
		throw error;
	}
}

function activeTarget() {
	const compiled = buildTarget();
	if (
		compiled === "dev" ||
		compiled === "node" ||
		compiled === "vercel" ||
		compiled === "cloudflare"
	) {
		return compiled;
	}
	return resolveDeployTarget();
}

/** Select the progress backend from the build target. Unset or empty means dev. */
export async function getProgressStore(): Promise<ProgressStore> {
	const target = activeTarget();
	if (target === "dev") {
		const { createDevProgressStore } = await import("./store-dev");
		return createDevProgressStore();
	}
	if (target === "node") {
		const { createNodeProgressStore } = await import("./store-node");
		return createNodeProgressStore();
	}
	if (target === "vercel") {
		if (blobConfigMissing()) {
			throw new ProgressStoreUnavailableError();
		}
		const { createVercelProgressStore } = await import("./store-vercel");
		return createVercelProgressStore();
	}
	const { createR2ProgressStore } = await import("./store-r2");
	return createR2ProgressStore();
}
