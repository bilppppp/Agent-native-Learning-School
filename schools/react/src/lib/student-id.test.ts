import { describe, expect, it, vi } from "vitest";
import { generateStudentId, isValidStudentId } from "./student-id";

describe("isValidStudentId", () => {
	it("accepts valid IDs", () => {
		expect(isValidStudentId("curious-explorer-2019")).toBe(true);
		expect(isValidStudentId("bright-wizard-1000")).toBe(true);
		expect(isValidStudentId("sharp-learner-9999")).toBe(true);
	});

	it("rejects IDs with wrong format", () => {
		expect(isValidStudentId("")).toBe(false);
		expect(isValidStudentId("single-1234")).toBe(false);
		expect(isValidStudentId("too-many-parts-1234")).toBe(false);
		expect(isValidStudentId("curious-explorer-123")).toBe(false);
		expect(isValidStudentId("curious-explorer-12345")).toBe(false);
		expect(isValidStudentId("Curious-explorer-1234")).toBe(false);
		expect(isValidStudentId("curious-explorer-abcd")).toBe(false);
	});
});

describe("generateStudentId", () => {
	it("returns a valid student ID without KV", async () => {
		const id = await generateStudentId();
		expect(isValidStudentId(id)).toBe(true);
	});

	it("generates different IDs on successive calls", async () => {
		const ids = new Set<string>();
		for (let i = 0; i < 20; i++) {
			ids.add(await generateStudentId());
		}
		expect(ids.size).toBe(20);
	});

	it("retries when the store returns a collision", async () => {
		let calls = 0;
		const mockStore = {
			get: vi.fn(async () => {
				calls++;
				return calls <= 2 ? '{"some":"data"}' : null;
			}),
		};

		const id = await generateStudentId(mockStore);
		expect(isValidStudentId(id)).toBe(true);
		expect(mockStore.get).toHaveBeenCalledTimes(3);
	});

	it("throws after exhausting retries", async () => {
		const mockStore = {
			get: vi.fn(async () => '{"some":"data"}'),
		};

		await expect(generateStudentId(mockStore, 3)).rejects.toThrow(
			"Failed to generate a unique student ID after retries",
		);
		expect(mockStore.get).toHaveBeenCalledTimes(3);
	});
});
