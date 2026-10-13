// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { getProgressStore, type ProgressStore } from "./store";

export type CompletionSource = "browser" | "agent";

export interface CompletedLesson {
	slug: string;
	completedAt: string;
	source: CompletionSource;
	model?: string;
}

export interface StudentProfile {
	[key: string]: unknown;
}

export interface CompletedExercise {
	slug: string;
	completedAt: string;
	source: CompletionSource;
	model?: string;
}

export interface StudentProgress {
	completedLessons: CompletedLesson[];
	completedExercises: CompletedExercise[];
	profile?: StudentProfile;
	createdAt: string;
	updatedAt: string;
	deviceId?: string;
}

type RawProgress = {
	completedLessons: (string | CompletedLesson)[];
	completedExercises?: (string | CompletedExercise)[];
	profile?: StudentProfile;
	createdAt: string;
	updatedAt: string;
	deviceId?: string;
};

// Legacy records stored completedLessons as string[] and may lack completedExercises. Normalize on read.
function normalizeProgress(raw: RawProgress): StudentProgress {
	return {
		...raw,
		completedLessons: raw.completedLessons.map((entry) =>
			typeof entry === "string"
				? {
						slug: entry,
						completedAt: raw.updatedAt,
						source: "browser" as CompletionSource,
					}
				: entry,
		),
		completedExercises: (raw.completedExercises ?? []).map((entry) =>
			typeof entry === "string"
				? {
						slug: entry,
						completedAt: raw.updatedAt,
						source: "browser" as CompletionSource,
					}
				: entry,
		),
	};
}

function kvKey(studentId: string): string {
	return `student:${studentId}`;
}

async function readProgress(
	store: ProgressStore,
	studentId: string,
): Promise<StudentProgress | null> {
	const raw = await store.get<RawProgress>(kvKey(studentId), "json");
	return raw ? normalizeProgress(raw) : null;
}

/** Fetch a student's progress. Returns null if not found. */
export async function getProgress(
	studentId: string,
): Promise<StudentProgress | null> {
	const store = await getProgressStore();
	return readProgress(store, studentId);
}

/**
 * Create a new student record if the ID is free. Returns null if that student
 * already exists; never overwrites an existing record.
 */
export async function createStudent(
	studentId: string,
	deviceId?: string,
): Promise<StudentProgress | null> {
	const store = await getProgressStore();
	const key = kvKey(studentId);
	return store.withLock(key, async () => {
		const existing = await store.get(key);
		if (existing) return null;

		const now = new Date().toISOString();
		const progress: StudentProgress = {
			completedLessons: [],
			completedExercises: [],
			createdAt: now,
			updatedAt: now,
			...(deviceId ? { deviceId } : {}),
		};
		await store.put(key, JSON.stringify(progress));
		return progress;
	});
}

/**
 * Mark a lesson as complete for a student. Idempotent — marking an already-completed
 * lesson is a no-op. Returns the updated progress, or null if the student doesn't exist.
 */
export async function markLessonComplete(
	studentId: string,
	lessonSlug: string,
	source: CompletionSource = "browser",
	model?: string,
): Promise<StudentProgress | null> {
	const store = await getProgressStore();
	const key = kvKey(studentId);
	return store.withLock(key, async () => {
		const progress = await readProgress(store, studentId);
		if (!progress) return null;

		if (!progress.completedLessons.some((l) => l.slug === lessonSlug)) {
			const entry: CompletedLesson = {
				slug: lessonSlug,
				completedAt: new Date().toISOString(),
				source,
			};
			if (model) entry.model = model;
			progress.completedLessons.push(entry);
		}
		progress.updatedAt = new Date().toISOString();
		await store.put(key, JSON.stringify(progress));
		return progress;
	});
}

/**
 * Mark an exercise as complete for a student. Idempotent — marking an already-completed
 * exercise is a no-op. Returns the updated progress, or null if the student doesn't exist.
 */
export async function markExerciseComplete(
	studentId: string,
	exerciseSlug: string,
	source: CompletionSource = "browser",
	model?: string,
): Promise<StudentProgress | null> {
	const store = await getProgressStore();
	const key = kvKey(studentId);
	return store.withLock(key, async () => {
		const progress = await readProgress(store, studentId);
		if (!progress) return null;

		if (!progress.completedExercises.some((e) => e.slug === exerciseSlug)) {
			const entry: CompletedExercise = {
				slug: exerciseSlug,
				completedAt: new Date().toISOString(),
				source,
			};
			if (model) entry.model = model;
			progress.completedExercises.push(entry);
		}
		progress.updatedAt = new Date().toISOString();
		await store.put(key, JSON.stringify(progress));
		return progress;
	});
}

/**
 * Mark a lesson as incomplete for a student. Removes the lesson from the
 * completedLessons array. No-op if the lesson wasn't completed. Returns the
 * updated progress, or null if the student doesn't exist.
 */
export async function markLessonIncomplete(
	studentId: string,
	lessonSlug: string,
): Promise<StudentProgress | null> {
	const store = await getProgressStore();
	const key = kvKey(studentId);
	return store.withLock(key, async () => {
		const progress = await readProgress(store, studentId);
		if (!progress) return null;

		progress.completedLessons = progress.completedLessons.filter(
			(l) => l.slug !== lessonSlug,
		);
		progress.updatedAt = new Date().toISOString();
		await store.put(key, JSON.stringify(progress));
		return progress;
	});
}

/**
 * Mark an exercise as incomplete for a student. Removes the exercise from the
 * completedExercises array. No-op if the exercise wasn't completed. Returns the
 * updated progress, or null if the student doesn't exist.
 */
export async function markExerciseIncomplete(
	studentId: string,
	exerciseSlug: string,
): Promise<StudentProgress | null> {
	const store = await getProgressStore();
	const key = kvKey(studentId);
	return store.withLock(key, async () => {
		const progress = await readProgress(store, studentId);
		if (!progress) return null;

		progress.completedExercises = progress.completedExercises.filter(
			(e) => e.slug !== exerciseSlug,
		);
		progress.updatedAt = new Date().toISOString();
		await store.put(key, JSON.stringify(progress));
		return progress;
	});
}

/**
 * Reset all progress for a student. Clears completedLessons and
 * completedExercises but preserves profile, createdAt, and deviceId.
 * Returns the updated progress, or null if the student doesn't exist.
 */
export async function resetProgress(
	studentId: string,
): Promise<StudentProgress | null> {
	const store = await getProgressStore();
	const key = kvKey(studentId);
	return store.withLock(key, async () => {
		const progress = await readProgress(store, studentId);
		if (!progress) return null;

		progress.completedLessons = [];
		progress.completedExercises = [];
		progress.updatedAt = new Date().toISOString();
		await store.put(key, JSON.stringify(progress));
		return progress;
	});
}

/** Fetch a student's profile. Returns null if the student doesn't exist. */
export async function getProfile(
	studentId: string,
): Promise<StudentProfile | null> {
	const progress = await getProgress(studentId);
	if (!progress) return null;
	return progress.profile ?? {};
}

/**
 * Merge partial profile data into a student's existing profile. Returns the
 * updated profile, or null if the student doesn't exist.
 */
export async function updateProfile(
	studentId: string,
	profile: Partial<StudentProfile>,
): Promise<StudentProfile | null> {
	const store = await getProgressStore();
	const key = kvKey(studentId);
	return store.withLock(key, async () => {
		const progress = await readProgress(store, studentId);
		if (!progress) return null;

		progress.profile = { ...progress.profile, ...profile };
		progress.updatedAt = new Date().toISOString();
		await store.put(key, JSON.stringify(progress));
		return progress.profile ?? {};
	});
}
