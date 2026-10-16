import { BeeIcon, BirdIcon, ButterflyIcon, FishIcon, FlowerIcon, LeafIcon, SailboatIcon, SnailIcon } from "naive-icons";

type MarkIcon = typeof FishIcon;

export const islandMarkIcons: MarkIcon[] = [FishIcon, LeafIcon, BirdIcon, ButterflyIcon, FlowerIcon, SailboatIcon, SnailIcon, BeeIcon];

let picked: MarkIcon | null = null;

export function pageMarkIcon(): MarkIcon {
	if (!picked) {
		const index = Math.floor(Math.random() * islandMarkIcons.length);
		picked = islandMarkIcons[index] ?? FishIcon;
	}
	return picked;
}
