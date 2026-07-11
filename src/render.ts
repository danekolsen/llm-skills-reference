import type { Category, Skill } from "./types";

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
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
			<span class="tag" style="background:${escapeHtml(category.color)}">${escapeHtml(category.name)}</span>
			<h2>${escapeHtml(category.name)}</h2>
			<span class="count">${skillCount} skill${skillCount === 1 ? "" : "s"}</span>
		</div>
		<p class="category-desc">${escapeHtml(category.description)}</p>
	`;
}

function inlineMd(value: string): string {
	return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// Tiny markdown-lite renderer: supports paragraphs and "- " bullet lists only.
function mdToHtml(text: string): string {
	const blocks = text.trim().split(/\n\s*\n/);
	return blocks
		.map((block) => {
			const lines = block
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean);
			const isList = lines.length > 0 && lines.every((line) => line.startsWith("- "));
			if (isList) {
				const items = lines.map((line) => `<li>${inlineMd(line.slice(2))}</li>`).join("");
				return `<ul>${items}</ul>`;
			}
			return `<p>${inlineMd(lines.join(" "))}</p>`;
		})
		.join("");
}

export function renderDescriptionBody(skill: Skill): string {
	if (skill.descriptionBullets && skill.descriptionBullets.length > 0) {
		const intro = skill.descriptionIntro ? `<p>${inlineMd(skill.descriptionIntro)}</p>` : "";
		const items = skill.descriptionBullets.map((bullet) => `<li>${inlineMd(bullet)}</li>`).join("");
		return `<div class="full-desc">${intro}<ul>${items}</ul></div>`;
	}
	// Avoid repeating the bold summary verbatim when the raw description has nothing more to add.
	if (skill.summary && skill.description.trim() === skill.summary.trim()) return "";
	return `<div class="full-desc">${mdToHtml(skill.description)}</div>`;
}

const PAUSE_PATTERN =
	/pause|wait(s|ing)? for|approv|ask(s|ing)? you|your (approval|input|decision|confirmation)|choose (between|from)|confirms?\b|decide\b/i;

export function renderHowToUse(skill: Skill): string {
	if (!skill.howToUse || skill.howToUse.length === 0) return "";
	if (skill.howToUse.length === 1) {
		return `
			<div class="how-to-use">
				<h4>How to use</h4>
				<p class="autonomous-note">${inlineMd(skill.howToUse[0] ?? "")}</p>
			</div>
		`;
	}
	const items = skill.howToUse
		.map((step) => {
			const tag = PAUSE_PATTERN.test(step) ? `<span class="step-pause-tag">Needs your input</span>` : "";
			return `<li>${tag}${inlineMd(step)}</li>`;
		})
		.join("");
	return `
		<div class="how-to-use">
			<h4>How to use</h4>
			<ol>${items}</ol>
		</div>
	`;
}

export function renderMetaTable(skill: Skill): string {
	const locationRow = skill.location
		? `<tr><td class="k">Location</td><td class="v"><code>${escapeHtml(skill.location)}</code></td></tr>`
		: "";
	const invocationText =
		skill.invocation === "manual"
			? "On-demand only (disable-model-invocation: true) — must be explicitly named"
			: "Auto-discoverable — Cursor may apply it automatically from context";
	const invocationRow = `<tr><td class="k">Invocation</td><td class="v">${invocationText}</td></tr>`;
	const updatedRow = skill.updated
		? `<tr><td class="k">Updated</td><td class="v"><span class="badge updated">${escapeHtml(skill.updated)}</span></td></tr>`
		: "";
	return `<table class="meta-table">${locationRow}${invocationRow}${updatedRow}</table>`;
}

export function renderNote(skill: Skill): string {
	if (!skill.note) return "";
	return `<div class="pending-note">${escapeHtml(skill.note)}</div>`;
}

export function renderExtraBadges(skill: Skill): string {
	const statusBadge = skill.status ? `<span class="badge status">${escapeHtml(skill.status)}</span>` : "";
	const sharedBadge = skill.shared ? `<span class="badge shared">Shared</span>` : "";
	return `${statusBadge}${sharedBadge}`;
}
