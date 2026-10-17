import { describe, expect, it } from "vitest";
import { assertVercelBuildEnv } from "./deploy-target";

describe("assertVercelBuildEnv", () => {
	it("accepts a connected blob store", () => {
		expect(() =>
			assertVercelBuildEnv({
				DEPLOY_TARGET: "vercel",
				BLOB_STORE_ID: "store_example",
			} as NodeJS.ProcessEnv),
		).not.toThrow();
	});

	it("accepts a read-write token", () => {
		expect(() =>
			assertVercelBuildEnv({
				DEPLOY_TARGET: "vercel",
				BLOB_READ_WRITE_TOKEN: "token",
			} as NodeJS.ProcessEnv),
		).not.toThrow();
	});

	it("names the store variable when neither credential is set", () => {
		expect(() =>
			assertVercelBuildEnv({ DEPLOY_TARGET: "vercel" } as NodeJS.ProcessEnv),
		).toThrow("BLOB_STORE_ID");
	});

	it("skips the check for other targets", () => {
		expect(() =>
			assertVercelBuildEnv({ DEPLOY_TARGET: "node" } as NodeJS.ProcessEnv),
		).not.toThrow();
	});
});
