import type { ReactNode } from "react";
import { BackTop, Background, Footer } from "animal-island-ui";
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
			<BackTop visibilityHeight={480} />
			<IslandSignals />
		</Background>
	);
}
