import { describe, expect, it, vi } from "vitest";

vi.mock("astro:content", () => ({
	getCollection: vi.fn(),
}));

import { validateSlug } from "./valid-slugs";

const lessonSlugs = new Set(["interview", "example-lesson", "another-example"]);

const exerciseSlugs = new Set(["example-exercise"]);

describe("validateSlug", () => {
	it("returns null for a valid lesson slug", () => {
		expect(validateSlug("interview", lessonSlugs, "lesson")).toBeNull();
	});

	it("returns null for a valid exercise slug", () => {
		expect(
			validateSlug("example-exercise", exerciseSlugs, "exercise"),
		).toBeNull();
	});

	it("returns an error for an unknown lesson slug", () => {
		expect(validateSlug("nonexistent", lessonSlugs, "lesson")).toBe(
			'Unknown lesson slug: "nonexistent"',
		);
	});

	it("returns an error for an unknown exercise slug", () => {
		expect(validateSlug("nonexistent", exerciseSlugs, "exercise")).toBe(
			'Unknown exercise slug: "nonexistent"',
		);
	});

	it("returns an error for an empty slug", () => {
		expect(validateSlug("", lessonSlugs, "lesson")).toBe(
			'Unknown lesson slug: ""',
		);
	});

	it("is case-sensitive", () => {
		expect(validateSlug("Interview", lessonSlugs, "lesson")).toBe(
			'Unknown lesson slug: "Interview"',
		);
	});
});
