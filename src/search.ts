import type { Skill } from "./types";

export function buildSearchText(skill: Skill): string {
	return [skill.name, skill.description, skill.summary, (skill.tags ?? []).join(" "), skill.note ?? ""]
		.join(" ")
		.toLowerCase();
}

export function filterSkills(skills: Skill[], query: string, activeTags: string[] = []): Skill[] {
	const normalized = query.trim().toLowerCase();
	return skills.filter((skill) => {
		const matchesQuery = !normalized || buildSearchText(skill).includes(normalized);
		const matchesTags = activeTags.every((tag) => (skill.tags ?? []).includes(tag));
		return matchesQuery && matchesTags;
	});
}

export function collectAllTags(skills: Skill[]): string[] {
	const tags = new Set<string>();
	for (const skill of skills) {
		for (const tag of skill.tags ?? []) tags.add(tag);
	}
	return Array.from(tags).sort((a, b) => a.localeCompare(b));
}
