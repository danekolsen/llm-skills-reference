import type { Category, Skill } from "./types";

export function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderTagChips(tags: string[] | undefined): string {
	return (tags ?? []).map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("");
}

function renderChipList(ids: string[], skillsById: Map<string, Skill>): string {
	return ids
		.map((id) => {
			const target = skillsById.get(id);
			const label = target ? target.name : id;
			return `<button class="skill-ref-chip" data-skill-ref="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
		})
		.join("");
}

export function renderCrossReferences(
	skill: Skill,
	usedBy: Map<string, string[]>,
	skillsById: Map<string, Skill>
): string {
	const dependsOn = skill.dependsOn ?? [];
	const usedByIds = usedBy.get(skill.id) ?? [];
	if (dependsOn.length === 0 && usedByIds.length === 0) return "";

	const dependsOnBlock =
		dependsOn.length > 0
			? `<div class="cross-ref"><span class="cross-ref-label">Depends on</span>${renderChipList(dependsOn, skillsById)}</div>`
			: "";
	const usedByBlock =
		usedByIds.length > 0
			? `<div class="cross-ref"><span class="cross-ref-label">Used by</span>${renderChipList(usedByIds, skillsById)}</div>`
			: "";

	return `<div class="cross-refs">${dependsOnBlock}${usedByBlock}</div>`;
}

export function renderCategoryHeader(category: Category, skillCount: number): string {
	return `
		<div class="category-head">
			<span class="tag" style="background:${category.color}">${escapeHtml(category.name)}</span>
			<h2>${escapeHtml(category.name)}</h2>
			<span class="count">${skillCount} skill${skillCount === 1 ? "" : "s"}</span>
		</div>
		<p class="category-desc">${escapeHtml(category.description)}</p>
	`;
}
