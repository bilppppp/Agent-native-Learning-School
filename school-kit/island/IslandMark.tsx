import { Divider, Title } from "animal-island-ui";

interface Props {
	name: string;
	size?: "small" | "middle" | "large";
	divider?: boolean;
}

export default function IslandMark({ name, size = "middle", divider = false }: Props) {
	return (
		<>
			<Title variant="ribbon" color="brown" size={size}>
				{name}
			</Title>
			{divider ? <Divider type="squiggle" /> : null}
		</>
	);
}
