import { useEffect, useState } from "react";
import { Tooltip } from "animal-island-ui";

const ROLES = [
	{ id: "warrior", sprite: "island-role-sprite--warrior" },
	{ id: "wizard", sprite: "island-role-sprite--wizard" },
	{ id: "priest", sprite: "island-role-sprite--priest" },
	{ id: "ranger", sprite: "island-role-sprite--ranger" },
] as const;

type RoleId = (typeof ROLES)[number]["id"];

interface Props {
	labels: Record<RoleId, string>;
	notes: Record<RoleId, string>;
}

function savedRole(): RoleId {
	if (typeof localStorage === "undefined") return "warrior";
	const saved = localStorage.getItem("learningRole");
	return ROLES.some((role) => role.id === saved) ? (saved as RoleId) : "warrior";
}

export default function IslandCast({ labels, notes }: Props) {
	const [selected, setSelected] = useState<RoleId>("warrior");

	useEffect(() => {
		setSelected(savedRole());
	}, []);

	return (
		<div className="island-role-picker">
			{ROLES.map((role) => (
				<Tooltip key={role.id} title={notes[role.id]} placement="top" style={{ display: "flex", width: "100%" }}>
					<button
						type="button"
						className="island-role-option"
						data-role={role.id}
						aria-pressed={selected === role.id}
						aria-label={labels[role.id]}
						onClick={() => setSelected(role.id)}
					>
						<span className={`island-role-sprite ${role.sprite}`} aria-hidden="true" />
						<span className="island-role-name">{labels[role.id]}</span>
					</button>
				</Tooltip>
			))}
		</div>
	);
}
