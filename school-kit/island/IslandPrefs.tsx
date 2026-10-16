import { useEffect, useRef, useState } from "react";
import { Button, Notification, Select, Tooltip } from "animal-island-ui";

const depthOptions = [
	{ key: "brief", label: "简短" },
	{ key: "some-context", label: "适中" },
	{ key: "all-details", label: "充分" },
];

const SAVED_NOTICE_KEY = "island-prefs-saved";

export default function IslandPrefs() {
	const [depth, setDepth] = useState("some-context");
	const [studentId, setStudentId] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const userChanged = useRef(false);

	useEffect(() => {
		const id = (window.school as { getStudentId?: () => string | null } | undefined)?.getStudentId?.() ?? null;
		setStudentId(id);
		if (!id) return;
		fetch(`/api/profile/${encodeURIComponent(id)}`)
			.then((response) => (response.ok ? response.json() : null))
			.then((body: { profile?: { depthPreference?: string } } | null) => {
				if (userChanged.current) return;
				const preference = body?.profile?.depthPreference;
				if (preference) setDepth(preference);
			})
			.catch(() => undefined);
	}, []);

	const save = async () => {
		Notification.destroy(SAVED_NOTICE_KEY);
		setPending(true);
		try {
			const id = (window.school as { getStudentId?: () => string | null } | undefined)?.getStudentId?.();
			if (!id) {
				Notification.info({ message: "还没有学习身份" });
				return;
			}
			const response = await fetch(`/api/profile/${encodeURIComponent(id)}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ depthPreference: depth }),
			});
			if (!response.ok) {
				Notification.error({ message: "偏好没有保存" });
				return;
			}
			Notification.success({ key: SAVED_NOTICE_KEY, message: "偏好已保存" });
		} catch {
			Notification.error({ message: "偏好没有保存" });
		} finally {
			setPending(false);
		}
	};

	return (
		<section className="island-prefs">
			<p className="island-prefs-label" id="island-depth-label">
				讲解详略
			</p>
			<div className="island-depth">
				<Select
					aria-labelledby="island-depth-label"
					options={depthOptions}
					value={depth}
					onChange={(next) => {
						userChanged.current = true;
						setDepth(next);
					}}
				/>
			</div>
			<Tooltip className="island-save-tip" title="偏好已保存" trigger="click" variant="island" bordered placement="top">
				<Button type="primary" disabled={!studentId || pending} onClick={save}>
					保存偏好
				</Button>
			</Tooltip>
		</section>
	);
}
