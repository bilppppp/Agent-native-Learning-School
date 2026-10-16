import { useEffect, useState } from "react";
import { Modal, Notification } from "animal-island-ui";

type Notice = { kind?: "success" | "info" | "warning" | "error"; message: string; description?: string };

export default function IslandSignals() {
	const [exitOpen, setExitOpen] = useState(false);

	useEffect(() => {
		const onNotice = (event: Event) => {
			const detail = (event as CustomEvent<Notice>).detail;
			if (!detail?.message) return;
			const kind = detail.kind ?? "info";
			Notification[kind]({ message: detail.message, description: detail.description });
		};
		const onExit = (event: MouseEvent) => {
			const link = (event.target as Element | null)?.closest?.("#sidebar-disenroll-link");
			if (!link) return;
			event.preventDefault();
			setExitOpen(true);
		};
		window.addEventListener("school:island-notice", onNotice);
		document.addEventListener("click", onExit);
		return () => {
			window.removeEventListener("school:island-notice", onNotice);
			document.removeEventListener("click", onExit);
		};
	}, []);

	return (
		<Modal open={exitOpen} title="退出课程" onClose={() => setExitOpen(false)} onOk={() => { window.location.href = "/disenroll"; }}>
			退出会清除这台浏览器上的学习身份。
		</Modal>
	);
}
