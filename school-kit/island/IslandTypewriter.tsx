import { useEffect, useState } from "react";
import { Typewriter } from "animal-island-ui";

interface Props {
	text: string;
}

export default function IslandTypewriter({ text }: Props) {
	return (
		<Typewriter autoPlay speed={36}>
			<p className="island-typewriter">{text}</p>
		</Typewriter>
	);
}
