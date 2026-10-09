import type { SchoolConfig } from "./src/lib/school";

const config: SchoolConfig = {
	name: "process-results",
	description: "理解 command 函数如何把子进程的 stdout/stderr、退出码和超时转换为 Promise 结果，并能预测调用行为",
	adjectives: [
		"bright",
		"clever",
		"cosmic",
		"curious",
		"eager",
		"golden",
		"keen",
		"mighty",
		"nimble",
		"radiant",
		"sharp",
		"steady",
	],
	nouns: [
		"builder",
		"explorer",
		"learner",
		"maker",
		"pioneer",
		"scholar",
		"seeker",
		"student",
		"thinker",
		"tinkerer",
		"traveler",
		"wizard",
	],
	colors: [
		"red",
		"orange",
		"amber",
		"yellow",
		"lime",
		"green",
		"emerald",
		"teal",
		"cyan",
		"sky",
		"blue",
		"indigo",
		"violet",
		"purple",
		"fuchsia",
		"pink",
		"rose",
		"slate",
	],
	profileFields: {
		learningStyle: {
			question: "How do you prefer to learn?",
			type: "single",
			options: [
				{
					value: "concepts-first",
					label: "Explain concepts first",
					description:
						"Understand the concept, then see practical applications",
				},
				{
					value: "hands-on",
					label: "Jump into hands-on exploration",
					description: "Start doing things, learn concepts as they come up",
				},
				{
					value: "examples",
					label: "Show me examples",
					description: "See concrete examples first, then infer the patterns",
				},
			],
			adaptation: {
				"concepts-first":
					"Explain the concept, then show the practical application.",
				"hands-on":
					"Jump straight to doing things, explain as concepts come up.",
				examples:
					"Lead with concrete examples, let the student infer the pattern.",
			},
		},
		depthPreference: {
			question: "How much detail do you want?",
			type: "single",
			options: [
				{
					value: "brief",
					label: "Keep it brief",
					description: "Short answers, get to the point",
				},
				{
					value: "some-context",
					label: "Some context is nice",
					description: "Normal explanations with some background",
				},
				{
					value: "all-details",
					label: "Give me all the details",
					description: "Thorough explanations, cover edge cases and rationale",
				},
			],
			adaptation: {
				brief: "Short answers. Get to the point. Minimal tangents.",
				"some-context": "Normal explanations with some background.",
				"all-details": "Thorough explanations. Cover edge cases and rationale.",
			},
		},
		teachingMode: {
			question: "How should your teacher guide you?",
			type: "single",
			options: [
				{ value: "simple", label: "Simple", description: "Focused explanations and fewer detours" },
				{ value: "immersive", label: "Immersive", description: "More questions, connections, and practice" },
			],
			adaptation: {
				simple: "Keep explanations concise and focus on the core lesson activity.",
				immersive: "Invite predictions, follow-up questions, connections, and short practice when useful.",
			},
		},
	},
	support: {
		issues: "https://github.com/your-org/your-school/issues",
	},
};

export default config;
