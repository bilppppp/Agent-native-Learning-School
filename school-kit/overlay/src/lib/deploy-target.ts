export type DeployTarget = "dev" | "node" | "vercel" | "cloudflare";

export function resolveDeployTarget(
	env: NodeJS.ProcessEnv = process.env,
): DeployTarget {
	const raw = env.DEPLOY_TARGET;
	if (raw === undefined || raw === "") return "dev";
	if (raw === "dev" || raw === "node" || raw === "vercel" || raw === "cloudflare") {
		return raw;
	}
	throw new Error(
		`Invalid DEPLOY_TARGET: ${JSON.stringify(raw)}. Expected "dev", "node", "vercel", or "cloudflare".`,
	);
}

function present(value: string | undefined): boolean {
	return value !== undefined && value !== "";
}

export function assertVercelBuildEnv(
	env: NodeJS.ProcessEnv = process.env,
): void {
	if (resolveDeployTarget(env) !== "vercel") return;
	if (present(env.BLOB_STORE_ID) || present(env.BLOB_READ_WRITE_TOKEN)) return;
	throw new Error("BLOB_STORE_ID");
}
