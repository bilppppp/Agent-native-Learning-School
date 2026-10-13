export function publicOrigin(
	request: Request,
	env: NodeJS.ProcessEnv = process.env,
): string {
	const configured = env.PUBLIC_ORIGIN;
	if (configured !== undefined && configured !== "") {
		return parseConfiguredOrigin(configured);
	}
	if (env.TRUST_PROXY === "true") {
		const forwarded = originFromForwardedHeaders(request);
		if (forwarded !== undefined) return forwarded;
	}
	return new URL(request.url).origin;
}

function parseConfiguredOrigin(value: string): string {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		throw invalidPublicOrigin(value);
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw invalidPublicOrigin(value);
	}
	if (parsed.username !== "" || parsed.password !== "") {
		throw invalidPublicOrigin(value);
	}
	if (value !== parsed.origin && value !== `${parsed.origin}/`) {
		throw invalidPublicOrigin(value);
	}
	return parsed.origin;
}

function invalidPublicOrigin(value: string): Error {
	return new Error(`Invalid PUBLIC_ORIGIN: ${JSON.stringify(value)}`);
}

function originFromForwardedHeaders(request: Request): string | undefined {
	const host = firstHeaderValue(request.headers.get("X-Forwarded-Host"));
	const proto = firstHeaderValue(request.headers.get("X-Forwarded-Proto"));
	if (host === undefined || proto === undefined) return undefined;
	if (proto !== "http" && proto !== "https") return undefined;
	try {
		return new URL(`${proto}://${host}`).origin;
	} catch {
		return undefined;
	}
}

function firstHeaderValue(value: string | null): string | undefined {
	if (value === null) return undefined;
	const first = value.split(",")[0]?.trim();
	return first === undefined || first === "" ? undefined : first;
}
