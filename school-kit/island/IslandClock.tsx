import { useEffect, useState } from "react";

function format(now: Date): string {
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
}

export default function IslandClock() {
	const [text, setText] = useState("");

	useEffect(() => {
		const tick = () => setText(format(new Date()));
		tick();
		const timer = window.setInterval(tick, 30_000);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<time className="island-clock" dateTime={text}>
			{text}
		</time>
	);
}
