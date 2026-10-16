import { useEffect, useState, type MouseEvent } from "react";
import { Tooltip } from "animal-island-ui";

interface Props {
	mode: "simple" | "immersive";
	label: string;
	title: string;
}

export default function IslandModeTip({ mode, label, title }: Props) {
	const [pressed, setPressed] = useState(false);

	useEffect(() => {
		const root = document.getElementById("teaching-mode-control");
		const read = () => {
			const stored = localStorage.getItem("teachingMode");
			const fallback = root?.getAttribute("data-default-mode") === "immersive" ? "immersive" : "simple";
			const current = stored === "immersive" || stored === "simple" ? stored : fallback;
			setPressed(current === mode);
		};
		const onVisual = (event: Event) => {
			const next = (event as CustomEvent<string>).detail;
			setPressed(next === mode);
		};
		read();
		root?.addEventListener("teaching-mode-visual", onVisual);
		return () => root?.removeEventListener("teaching-mode-visual", onVisual);
	}, [mode]);

	const place = (event: MouseEvent<HTMLButtonElement>) => {
		const host = event.currentTarget.parentElement;
		if (!host) return;
		const x = Math.min(window.innerWidth - 130, Math.max(130, event.clientX));
		const y = Math.max(76, event.clientY);
		host.style.setProperty("--island-tip-x", `${x}px`);
		host.style.setProperty("--island-tip-y", `${y}px`);
	};

	return (
		<Tooltip title={title} variant="island" bordered placement="top" className="island-mode-tip">
			<button
				type="button"
				className={`teaching-mode-option rounded-lg border px-3 py-3 text-left transition-colors${pressed ? " theme-active-nav border-transparent" : " border-gray-300 dark:border-stone-700"}`}
				data-teaching-mode={mode}
				aria-pressed={pressed ? "true" : "false"}
				onMouseEnter={place}
				onMouseMove={place}
			>
				<span className="block font-medium">{label}</span>
			</button>
		</Tooltip>
	);
}
