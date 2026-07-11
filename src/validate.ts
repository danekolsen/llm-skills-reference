import type { Config, Data, Skill } from "./types";

export interface ValidationError {
	message: string;
}

const REQUIRED_FIELDS: (keyof Skill)[] = ["id", "categoryId", "name", "invocation", "description", "summary"];

export function validateData(config: Config, data: Data): ValidationError[] {
	const errors: ValidationError[] = [];
	const categoryIds = new Set(config.categories.map((category) => category.id));
	const skillIds = new Set(data.skills.map((skill) => skill.id));

	for (const skill of data.skills) {
		for (const field of REQUIRED_FIELDS) {
			if (!skill[field]) {
				errors.push({ message: `Skill "${skill.id || "<unknown>"}" is missing required field "${field}"` });
			}
		}
		if (skill.categoryId && !categoryIds.has(skill.categoryId)) {
			errors.push({ message: `Skill "${skill.id}" has unknown categoryId "${skill.categoryId}"` });
		}
		for (const dependencyId of skill.dependsOn ?? []) {
			if (!skillIds.has(dependencyId)) {
				errors.push({ message: `Skill "${skill.id}" depends on unknown skill "${dependencyId}"` });
			}
		}
	}

	return errors;
}
