import { useEffect, useState } from "react";
import IslandPrefs from "./IslandPrefs";
import { pageMarkIcon } from "./island-icons";

export interface BoardLesson {
	slug: string;
	title: string;
	description: string;
	order: number;
	stub: boolean;
}

type StationKind = "done" | "current" | "later";

type SchoolApi = {
	isLessonComplete?: (slug: string) => boolean;
	isLessonVisited?: (slug: string) => boolean;
	updateAllCheckmarks?: () => void;
};

function schoolApi(): SchoolApi | undefined {
	if (typeof window === "undefined") return undefined;
	return window.school as SchoolApi | undefined;
}

function StatusHooks() {
	return (
		<span className="lesson-status island-status-hook" aria-hidden="true">
			<span className="lesson-status-dot" />
			<span className="lesson-check hidden">✓</span>
		</span>
	);
}

export default function IslandLessonBoard({ lessons }: { lessons: BoardLesson[] }) {
	const [nextSlug, setNextSlug] = useState<string | null>(lessons.find((lesson) => !lesson.stub)?.slug ?? null);
	const [complete, setComplete] = useState<Record<string, boolean>>({});
	const [visited, setVisited] = useState<Record<string, boolean>>({});
	const [ready, setReady] = useState(false);
	const [prefsOpen, setPrefsOpen] = useState(false);
	const [MarkIcon, setMarkIcon] = useState<ReturnType<typeof pageMarkIcon> | null>(null);

	useEffect(() => {
		setMarkIcon(() => pageMarkIcon());
	}, []);

	useEffect(() => {
		const sync = () => {
			const school = schoolApi();
			const done: Record<string, boolean> = {};
			const seen: Record<string, boolean> = {};
			for (const lesson of lessons) {
				done[lesson.slug] = Boolean(school?.isLessonComplete?.(lesson.slug));
				seen[lesson.slug] = Boolean(school?.isLessonVisited?.(lesson.slug));
			}
			const next = lessons.find((lesson) => !lesson.stub && !done[lesson.slug]);
			setComplete(done);
			setVisited(seen);
			setNextSlug(next?.slug ?? null);
			setReady(true);
		};
		sync();
		const school = schoolApi();
		const previous = school?.updateAllCheckmarks;
		const wrapped = () => {
			previous?.call(school);
			sync();
		};
		if (school && typeof previous === "function") school.updateAllCheckmarks = wrapped;
		window.addEventListener("school:progress", sync);
		window.addEventListener("school:enrolled", sync);
		return () => {
			window.removeEventListener("school:progress", sync);
			window.removeEventListener("school:enrolled", sync);
			if (school && school.updateAllCheckmarks === wrapped && previous) school.updateAllCheckmarks = previous;
		};
	}, [lessons]);

	const kindOf = (lesson: BoardLesson): StationKind => {
		if (lesson.stub) return "later";
		if (complete[lesson.slug]) return "done";
		if (lesson.slug === nextSlug) return "current";
		return "later";
	};

	const allDone = ready && nextSlug === null;
	const doneLessons = lessons.filter((lesson) => complete[lesson.slug]);
	const openLessons = lessons.filter((lesson) => !complete[lesson.slug]);
	const orderedLessons = [...doneLessons, ...openLessons];

	return (
		<div className="island-board">
			{allDone ? <p className="island-path-done">这一路的关卡都走完了。</p> : null}
			<ol className="island-path">
				{orderedLessons.map((lesson) => {
					const kind = kindOf(lesson);
					const cta = kind === "current" && visited[lesson.slug] ? "继续学习" : "开始学习";
					const kicker = kind === "done" ? `第 ${lesson.order} 站 · 已完成` : kind === "current" ? "下一站" : "还没走到";
					return (
						<li key={lesson.slug} className={`island-station island-station-${kind}`} data-lesson-slug={lesson.slug} data-lesson-stub={lesson.stub ? "true" : "false"}>
							<div className="lesson-row island-station-body">
								<a className="lesson-link" href={`/lessons/${lesson.slug}`}>
									<span className="island-station-kicker">{kicker}</span>
									<span className="lesson-title">{lesson.title}</span>
									{kind === "current" ? <span className="lesson-description">{lesson.description}</span> : null}
								</a>
								<a className={`lesson-cta theme-button${kind === "current" ? "" : " hidden"}`} href={`/lessons/${lesson.slug}`}>
									{cta}
								</a>
								<StatusHooks />
							</div>
						</li>
					);
				})}
			</ol>
			<section className="island-prefs-fold">
				<button type="button" className="island-prefs-toggle" aria-expanded={prefsOpen} onClick={() => setPrefsOpen((open) => !open)}>
					<span className="island-prefs-mark" aria-hidden="true">
						{prefsOpen ? "−" : "+"}
					</span>
					<span className="island-prefs-title">调整我的学习方式</span>
					{MarkIcon ? (
						<span className={`island-prefs-icon${prefsOpen ? " is-open" : ""}`} aria-hidden="true">
							<MarkIcon size={20} />
						</span>
					) : (
						<span className="island-prefs-icon" aria-hidden="true" />
					)}
				</button>
				{prefsOpen ? <IslandPrefs /> : null}
			</section>
		</div>
	);
}
