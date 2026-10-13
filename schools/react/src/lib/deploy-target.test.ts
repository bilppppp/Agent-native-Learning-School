import { describe, expect, it } from "vitest";
import { assertVercelBuildEnv, resolveDeployTarget } from "./deploy-target";

describe("assertVercelBuildEnv", () => {
	it("fails the vercel build when the blob token is missing and only names the variable", () => {
		expect(() =>
			assertVercelBuildEnv({
				DEPLOY_TARGET: "vercel",
			}),
		).toThrow("BLOB_READ_WRITE_TOKEN");

		try {
			assertVercelBuildEnv({
				DEPLOY_TARGET: "vercel",
				BLOB_READ_WRITE_TOKEN: "",
			});
			throw new Error("expected assertVercelBuildEnv to throw");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe("BLOB_READ_WRITE_TOKEN");
			expect(String(error)).not.toContain("vercel_blob");
		}
	});

	it("does not fail dest or node builds when the blob token is missing", () => {
		expect(() => assertVercelBuildEnv({ DEPLOY_TARGET: "dev" })).not.toThrow();
		expect(() => assertVercelBuildEnv({ DEPLOY_TARGET: "node" })).not.toThrow();
		expect(() => assertVercelBuildEnv({})).not.toThrow();
	});

	it("accepts a vercel build when the blob token is present", () => {
		expect(() =>
			assertVercelBuildEnv({
				DEPLOY_TARGET: "vercel",
				BLOB_READ_WRITE_TOKEN: "vercel_blob_test_token",
			}),
		).not.toThrow();
	});
});

describe("resolveDeployTarget", () => {
	it("defaults unset and empty values to dest", () => {
		expect(resolveDeployTarget({})).toBe("dev");
		expect(resolveDeployTarget({ DEPLOY_TARGET: "" })).toBe("dev");
	});
});
