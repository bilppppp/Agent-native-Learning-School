import { Avatar, Tooltip } from "animal-island-ui";

const ROLES = [
	{ name: "战士", mark: "战" },
	{ name: "巫师", mark: "巫" },
	{ name: "牧师", mark: "牧" },
	{ name: "游侠", mark: "侠" },
];

export default function IslandCast() {
	return (
		<div className="island-cast">
			{ROLES.map((role) => (
				<Tooltip key={role.name} title={role.name} variant="island">
					<Avatar shape="square" size={48} alt={role.name}>
						{role.mark}
					</Avatar>
				</Tooltip>
			))}
		</div>
	);
}
