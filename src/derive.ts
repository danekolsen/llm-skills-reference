import type { Skill } from "./types";

export function deriveUsedBy(skills: Skill[]): Map<string, string[]> {
	const usedBy = new Map<string, string[]>();
	for (const skill of skills) {
		for (const dependencyId of skill.dependsOn ?? []) {
			// No dedup and no existence check against skillIds: a skill listing the same
			// dependency twice will appear twice here (this function doesn't dedup, and
			// nothing else does either), and a dependency id that doesn't match any known
			// skill is still recorded — validateData() flags that latter case as a dangling
			// dependsOn reference, but this function just mirrors dependsOn as-is either way.
			const existing = usedBy.get(dependencyId) ?? [];
			existing.push(skill.id);
			usedBy.set(dependencyId, existing);
		}
	}
	return usedBy;
}
