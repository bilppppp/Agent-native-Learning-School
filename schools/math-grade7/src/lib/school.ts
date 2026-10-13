export interface ProfileFieldOption {
	value: string;
	label: string;
	description?: string;
}

export interface ProfileField {
	question: string;
	type: "single" | "multi";
	options: ProfileFieldOption[];
	adaptation: Record<string, string>;
}

export interface SchoolConfig {
	name: string;
	description: string;
	adjectives: string[];
	nouns: string[];
	colors: string[];
	profileFields: Record<string, ProfileField>;
	support: {
		issues: string;
		community?: string;
	};
}
