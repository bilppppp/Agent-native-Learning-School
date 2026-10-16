import type { ReactNode } from "react";
import { Background, Footer } from "animal-island-ui";
import IslandRocket from "./IslandRocket";
import IslandSignals from "./IslandSignals";

interface Props {
	children?: ReactNode;
	shortName?: string;
}

export default function IslandShell({ children, shortName = "" }: Props) {
	return (
		<Background type="sweet-corner" className="island-page-bg">
			{children}
			<Footer text={shortName} />
			<IslandRocket />
			<IslandSignals />
		</Background>
	);
}
