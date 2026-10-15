import { useEffect, useState } from "react";
import { Progress } from "animal-island-ui";

type SchoolProgress = {
	completedLessons?: unknown[];
};

type SchoolApi = {
	getCachedProgress?: () => SchoolProgress | null;
	updateAllCheckmarks?: () => void;
};

declare global {
	interface Window {
		school?: SchoolApi;
	}
}

interface Props {
	total: number;
}

function completedCount(): number {
	const lessons = window.school?.getCachedProgress?.()?.completedLessons;
	return Array.isArray(lessons) ? lessons.length : 0;
}

export default function IslandProgress({ total }: Props) {
	const [percent, setPercent] = useState(0);

	useEffect(() => {
		const read = () => {
			const done = completedCount();
			setPercent(total > 0 ? Math.min(100, (done / total) * 100) : 0);
		};
		read();

		const school = window.school;
		const previousCheckmarks = school?.updateAllCheckmarks;
		const wrappedCheckmarks = () => {
			previousCheckmarks?.();
			read();
		};
		if (school && typeof previousCheckmarks === "function") {
			school.updateAllCheckmarks = wrappedCheckmarks;
		}

		const onProgress = () => read();
		window.addEventListener("school:progress", onProgress);
		window.addEventListener("school:enrolled", onProgress);
		return () => {
			window.removeEventListener("school:progress", onProgress);
			window.removeEventListener("school:enrolled", onProgress);
			if (school && school.updateAllCheckmarks === wrappedCheckmarks && previousCheckmarks) {
				school.updateAllCheckmarks = previousCheckmarks;
			}
		};
	}, [total]);

	return <Progress percent={percent} variant="sweet-corner" size="small" />;
}
