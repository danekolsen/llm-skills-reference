import type { Config, Data, Skill } from "./types";

export interface ValidationError {
	message: string;
}

const REQUIRED_FIELDS: (keyof Skill)[] = ["id", "categoryId", "name", "invocation", "description", "summary"];

function findDuplicates(values: string[]): string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) {
			duplicates.add(value);
		}
		seen.add(value);
	}
	return [...duplicates];
}

export function validateData(config: Config, data: Data): ValidationError[] {
	const errors: ValidationError[] = [];
	const categoryIds = new Set(config.categories.map((category) => category.id));
	const skillIds = new Set(data.skills.map((skill) => skill.id));

	for (const duplicateCategoryId of findDuplicates(config.categories.map((category) => category.id))) {
		errors.push({ message: `Category id "${duplicateCategoryId}" is used by more than one category` });
	}
	for (const duplicateSkillId of findDuplicates(data.skills.map((skill) => skill.id))) {
		errors.push({ message: `Skill id "${duplicateSkillId}" is used by more than one skill` });
	}

	for (const skill of data.skills) {
		const displayId = skill.id || "<unknown>";

		for (const field of REQUIRED_FIELDS) {
			// Falsy check, not strict presence: intentional since all required fields today
			// are non-empty strings. Revisit if a required field is ever a boolean/number,
			// where a legitimate falsy value (e.g. `false`, `0`) would be wrongly flagged.
			if (!skill[field]) {
				errors.push({ message: `Skill "${displayId}" is missing required field "${field}"` });
			}
		}
		if (skill.categoryId && !categoryIds.has(skill.categoryId)) {
			errors.push({ message: `Skill "${displayId}" has unknown categoryId "${skill.categoryId}"` });
		}
		for (const dependencyId of skill.dependsOn ?? []) {
			if (!skillIds.has(dependencyId)) {
				errors.push({ message: `Skill "${displayId}" depends on unknown skill "${dependencyId}"` });
			}
		}
	}

	return errors;
}
