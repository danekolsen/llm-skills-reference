import type { Skill } from "./types";

export function buildSearchText(skill: Skill): string {
	return [skill.name, skill.description, skill.summary, (skill.tags ?? []).join(" "), skill.note ?? ""]
		.join(" ")
		.toLowerCase();
}

export function filterSkills(skills: Skill[], query: string): Skill[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return skills;
	return skills.filter((skill) => buildSearchText(skill).includes(normalized));
}
