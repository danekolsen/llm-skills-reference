import type { Category, Config, Data, Skill } from "./types";
import { deriveUsedBy } from "./derive";
import { filterSkills } from "./search";
import { escapeHtml, renderCategoryHeader, renderCrossReferences, renderTagChips } from "./render";
import { getPreferredTheme, readStoredTheme, writeStoredTheme, type Theme } from "./theme";

function readEmbeddedJson<T>(doc: Document, elementId: string): T {
	const element = doc.getElementById(elementId);
	if (!element || !element.textContent) {
		throw new Error(`Missing embedded data for #${elementId}`);
	}
	return JSON.parse(element.textContent) as T;
}

function renderSkillCard(
	skill: Skill,
	category: Category,
	usedBy: Map<string, string[]>,
	skillsById: Map<string, Skill>
): string {
	const modeBadge = skill.interactive
		? `<span class="badge interactive">Interactive</span>`
		: `<span class="badge autonomous">Autonomous</span>`;
	const invocationBadge = `<span class="badge ${skill.invocation === "manual" ? "manual" : "auto"}">${
		skill.invocation === "manual" ? "Manual invocation" : "Auto-discoverable"
	}</span>`;
	const searchText = [skill.name, skill.description, skill.summary, (skill.tags ?? []).join(" ")]
		.join(" ")
		.toLowerCase();

	return `
		<div class="skill" data-search-text="${escapeHtml(searchText)}" data-skill-id="${escapeHtml(skill.id)}">
			<div class="skill-row">
				<span class="tag" style="background:${escapeHtml(category.color)}">${escapeHtml(category.name)}</span>
				<span class="skill-name">${escapeHtml(skill.name)}</span>
				<span class="topic-tags">${renderTagChips(skill.tags)}${modeBadge}</span>
				${invocationBadge}
				<span class="chevron">&#9656;</span>
			</div>
			<div class="skill-body">
				<p class="skill-summary-line"><strong>${escapeHtml(skill.summary)}</strong></p>
				${renderCrossReferences(skill, usedBy, skillsById)}
			</div>
		</div>
	`;
}

export function renderSkillsIntoContainer(
	container: HTMLElement,
	categories: Category[],
	skills: Skill[],
	usedBy: Map<string, string[]>,
	skillsById: Map<string, Skill>
): void {
	container.innerHTML = categories
		.map((category) => {
			const categorySkills = skills.filter((skill) => skill.categoryId === category.id);
			if (categorySkills.length === 0) return "";
			const cards = categorySkills.map((skill) => renderSkillCard(skill, category, usedBy, skillsById)).join("");
			return `<section class="category" data-cat-id="${escapeHtml(category.id)}">${renderCategoryHeader(
				category,
				categorySkills.length
			)}${cards}</section>`;
		})
		.join("");
}

export function wireInteractions(doc: Document, skills: Skill[]): void {
	doc.querySelectorAll<HTMLElement>(".skill-row").forEach((row) => {
		row.addEventListener("click", () => {
			row.parentElement?.classList.toggle("open");
		});
	});

	doc.querySelectorAll<HTMLButtonElement>(".skill-ref-chip").forEach((chip) => {
		chip.addEventListener("click", (event) => {
			event.stopPropagation();
			const targetId = chip.dataset.skillRef;
			const target = doc.querySelector<HTMLElement>(`.skill[data-skill-id="${targetId}"]`);
			target?.classList.add("open");
			target?.scrollIntoView({ block: "center" });
		});
	});

	doc.getElementById("expandAll")?.addEventListener("click", () => {
		doc.querySelectorAll(".skill").forEach((el) => el.classList.add("open"));
	});
	doc.getElementById("collapseAll")?.addEventListener("click", () => {
		doc.querySelectorAll(".skill").forEach((el) => el.classList.remove("open"));
	});

	const searchBox = doc.getElementById("searchBox") as HTMLInputElement | null;
	searchBox?.addEventListener("input", () => {
		const matches = new Set(filterSkills(skills, searchBox.value).map((skill) => skill.id));
		doc.querySelectorAll<HTMLElement>(".skill").forEach((el) => {
			const skillId = el.dataset.skillId ?? "";
			el.classList.toggle("hidden", searchBox.value.trim().length > 0 && !matches.has(skillId));
		});
		doc.querySelectorAll<HTMLElement>(".category").forEach((categoryEl) => {
			const anyVisible = Array.from(categoryEl.querySelectorAll(".skill")).some(
				(el) => !el.classList.contains("hidden")
			);
			categoryEl.classList.toggle("hidden", !anyVisible);
		});
	});
}

function applyTheme(doc: Document, theme: Theme): void {
	doc.documentElement.dataset.theme = theme;
}

export function wireTheme(doc: Document, win: Window): void {
	const stored = readStoredTheme(win.localStorage);
	const prefersDark = win.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
	let current: Theme = stored ?? getPreferredTheme(prefersDark);
	applyTheme(doc, current);

	doc.getElementById("themeToggle")?.addEventListener("click", () => {
		current = current === "dark" ? "light" : "dark";
		applyTheme(doc, current);
		writeStoredTheme(win.localStorage, current);
	});
}

export function boot(doc: Document, win: Window): void {
	const config = readEmbeddedJson<Config>(doc, "config-data");
	const data = readEmbeddedJson<Data>(doc, "skills-data");
	const usedBy = deriveUsedBy(data.skills);
	const skillsById = new Map(data.skills.map((skill) => [skill.id, skill]));

	const app = doc.getElementById("app");
	if (!app) throw new Error("Missing #app container");
	renderSkillsIntoContainer(app, config.categories, data.skills, usedBy, skillsById);
	wireInteractions(doc, data.skills);
	wireTheme(doc, win);

	const summaryCounts = doc.getElementById("summaryCounts");
	if (summaryCounts) {
		const counts = config.categories
			.map(
				(category) =>
					`<span>${escapeHtml(category.name)}: ${
						data.skills.filter((skill) => skill.categoryId === category.id).length
					}</span>`
			)
			.join("");
		summaryCounts.innerHTML = `<span>Total: ${data.skills.length}</span>${counts}`;
	}
}

if (typeof document !== "undefined" && document.getElementById("app")) {
	boot(document, window);
}
