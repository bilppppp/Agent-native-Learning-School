import { useEffect, useState } from "react";
import { Tabs } from "animal-island-ui";

interface Props {
	readLabel: string;
	teachLabel: string;
}

export default function LessonTabs({ readLabel, teachLabel }: Props) {
	const [active, setActive] = useState("read");

	useEffect(() => {
		for (const panel of document.querySelectorAll<HTMLElement>("[data-lesson-panel]")) {
			panel.hidden = panel.dataset.lessonPanel !== active;
		}
		window.dispatchEvent(new CustomEvent("school:island-lesson-tab", { detail: { panel: active } }));
	}, [active]);

	return (
		<div className="island-lesson-tabs">
			<Tabs
				activeKey={active}
				onChange={setActive}
				aria-label="这一关"
				items={[
					{ key: "read", label: readLabel, children: null },
					{ key: "teach", label: teachLabel, children: null },
				]}
			/>
		</div>
	);
}
