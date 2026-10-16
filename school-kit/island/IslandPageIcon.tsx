import { useEffect, useState } from "react";
import { pageMarkIcon } from "./island-icons";

interface Props {
	size?: number;
}

export default function IslandPageIcon({ size = 22 }: Props) {
	const [Icon, setIcon] = useState<ReturnType<typeof pageMarkIcon> | null>(null);

	useEffect(() => {
		setIcon(() => pageMarkIcon());
	}, []);

	if (!Icon) return <span className="island-page-icon" aria-hidden="true" />;
	return (
		<span className="island-page-icon" aria-hidden="true">
			<Icon size={size} />
		</span>
	);
}
