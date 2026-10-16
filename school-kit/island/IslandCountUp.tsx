import { useEffect, useRef, useState } from "react";
import { CountUp } from "animal-island-ui";

type SchoolProgress = {
	completedLessons?: unknown[];
};

type SchoolApi = {
	getCachedProgress?: () => SchoolProgress | null;
	isLessonComplete?: (slug: string) => boolean;
	updateAllCheckmarks?: () => void;
};

declare global {
	interface Window {
		school?: SchoolApi;
		__islandLessonJustCompleted?: boolean;
	}
}

interface Props {
	currentLessonSlug?: string;
}

function completedCount(): number {
	const lessons = window.school?.getCachedProgress?.()?.completedLessons;
	return Array.isArray(lessons) ? lessons.length : 0;
}

function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function announceDone() {
	window.dispatchEvent(new CustomEvent("school:island-countup-done"));
}

export default function IslandCountUp({ currentLessonSlug = "" }: Props) {
	const [start, setStart] = useState(0);
	const [end, setEnd] = useState(0);
	const [counting, setCounting] = useState(false);
	const [celebrate, setCelebrate] = useState(false);
	const [ready, setReady] = useState(false);
	const lastCount = useRef(0);
	const seenCurrentComplete = useRef(false);
	const serverSynced = useRef(false);
	const lang =
		typeof document !== "undefined" && document.documentElement.lang.startsWith("zh")
			? "zh"
			: "en";

	useEffect(() => {
		const currentComplete = () =>
			Boolean(currentLessonSlug) && Boolean(window.school?.isLessonComplete?.(currentLessonSlug));

		const settle = (value: number) => {
			lastCount.current = value;
			setStart(value);
			setEnd(value);
			setCounting(false);
			setCelebrate(false);
			setReady(true);
		};

		const play = (from: number, to: number) => {
			lastCount.current = to;
			if (prefersReducedMotion()) {
				settle(to);
				announceDone();
				return;
			}
			setStart(from);
			setEnd(to);
			setCelebrate(true);
			setCounting(true);
			setReady(true);
		};

		const apply = (fromServer: boolean) => {
			const next = completedCount();
			const nowComplete = currentComplete();
			const flagged = Boolean(window.__islandLessonJustCompleted);

			if (!serverSynced.current && !(flagged && nowComplete)) {
				if (fromServer) serverSynced.current = true;
				seenCurrentComplete.current = nowComplete;
				settle(next);
				return;
			}

			serverSynced.current = true;
			window.__islandLessonJustCompleted = false;
			const justCompleted =
				flagged ||
				(Boolean(currentLessonSlug) && !seenCurrentComplete.current && nowComplete);
			seenCurrentComplete.current = nowComplete || seenCurrentComplete.current;

			if (justCompleted && next !== lastCount.current) {
				play(lastCount.current, next);
				return;
			}
			if (next !== lastCount.current) settle(next);
		};

		apply(false);

		const school = window.school;
		const previousCheckmarks = school?.updateAllCheckmarks;
		const wrappedCheckmarks = () => {
			previousCheckmarks?.call(school);
			apply(false);
		};
		if (school && typeof previousCheckmarks === "function") {
			school.updateAllCheckmarks = wrappedCheckmarks;
		}

		const onProgress = () => apply(true);
		const onSignal = () => apply(false);
		window.addEventListener("school:progress", onProgress);
		window.addEventListener("school:island-lesson-complete", onSignal);
		return () => {
			window.removeEventListener("school:progress", onProgress);
			window.removeEventListener("school:island-lesson-complete", onSignal);
			if (school && school.updateAllCheckmarks === wrappedCheckmarks && previousCheckmarks) {
				school.updateAllCheckmarks = previousCheckmarks;
			}
		};
	}, [currentLessonSlug]);

	if (!ready) return null;

	return (
		<div className="island-count-wrap">
			<p className="island-count-label">{lang === "zh" ? "已完成关卡" : "Lessons completed"}</p>
			<CountUp
				start={start}
				end={end}
				duration={counting ? 1.6 : 0}
				isCounting={counting}
				decimalPlaces={0}
				celebrate={celebrate}
				variant="island"
				size="middle"
				onComplete={() => {
					setCounting(false);
					setCelebrate(false);
					announceDone();
				}}
			/>
		</div>
	);
}
