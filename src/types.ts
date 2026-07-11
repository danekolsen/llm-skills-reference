export type Invocation = "auto" | "manual";

export interface Category {
	id: string;
	name: string;
	color: string;
	description: string;
	scanPaths: string[];
}

export interface Config {
	categories: Category[];
}

export interface Skill {
	id: string;
	categoryId: string;
	name: string;
	invocation: Invocation;
	description: string;
	summary: string;
	location?: string;
	note?: string;
	status?: string;
	descriptionIntro?: string;
	descriptionBullets?: string[];
	howToUse?: string[];
	tags?: string[];
	interactive?: boolean;
	shared?: boolean;
	updated?: string;
	dependsOn?: string[];
}

export interface Data {
	skills: Skill[];
}
