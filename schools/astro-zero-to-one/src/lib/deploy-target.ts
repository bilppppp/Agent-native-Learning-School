export type DeployTarget = "dev" | "node" | "vercel";

export function resolveDeployTarget(
	env: NodeJS.ProcessEnv = process.env,
): DeployTarget {
	const raw = env.DEPLOY_TARGET;
	if (raw === undefined || raw === "") return "dev";
	if (raw === "dev" || raw === "node" || raw === "vercel") return raw;
	throw new Error(
		`Invalid DEPLOY_TARGET: ${JSON.stringify(raw)}. Expected "dev", "node", or "vercel".`,
	);
}

export function assertVercelBuildEnv(
	env: NodeJS.ProcessEnv = process.env,
): void {
	if (resolveDeployTarget(env) !== "vercel") return;
	const token = env.BLOB_READ_WRITE_TOKEN;
	if (token === undefined || token === "") {
		throw new Error("BLOB_READ_WRITE_TOKEN");
	}
}
