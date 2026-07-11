import type { Skill } from "./types";

export function deriveUsedBy(skills: Skill[]): Map<string, string[]> {
	const usedBy = new Map<string, string[]>();
	for (const skill of skills) {
		for (const dependencyId of skill.dependsOn ?? []) {
			// No dedup and no existence check against skillIds: a skill listing the same
			// dependency twice will appear twice here, and a dependency id that doesn't
			// match any known skill is still recorded. validateData() is responsible for
			// flagging both cases; this function just mirrors dependsOn as-is.
			const existing = usedBy.get(dependencyId) ?? [];
			existing.push(skill.id);
			usedBy.set(dependencyId, existing);
		}
	}
	return usedBy;
}
