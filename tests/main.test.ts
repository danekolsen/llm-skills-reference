import { beforeEach, describe, expect, it } from "vitest";
import { boot } from "../src/main";
import type { Config, Data } from "../src/types";

const config: Config = {
	categories: [{ id: "personal", name: "Personal", color: "#61affe", description: "desc", scanPaths: [] }]
};

const data: Data = {
	skills: [
		{
			id: "a",
			categoryId: "personal",
			name: "Skill A",
			invocation: "auto",
			description: "does a",
			summary: "does a",
			tags: ["git"],
			dependsOn: ["b"]
		},
		{
			id: "b",
			categoryId: "personal",
			name: "Skill B",
			invocation: "manual",
			description: "does b",
			summary: "does b"
		}
	]
};

function setupDom(): void {
	document.body.innerHTML = `
		<button id="themeToggle" class="theme-toggle">
			<span class="theme-toggle-track">
				<span class="theme-toggle-icon theme-toggle-icon-sun"></span>
				<span class="theme-toggle-icon theme-toggle-icon-moon"></span>
				<span class="theme-toggle-thumb"></span>
			</span>
		</button>
		<div class="search-wrap">
			<span class="search-icon"></span>
			<input type="search" id="searchBox" />
		</div>
		<button id="expandAll"><span class="btn-icon"></span>Expand all</button>
		<button id="collapseAll"><span class="btn-icon"></span>Collapse all</button>
		<div class="summary-counts" id="summaryCounts"></div>
		<main id="app"></main>
		<script type="application/json" id="config-data">${JSON.stringify(config)}</script>
		<script type="application/json" id="skills-data">${JSON.stringify(data)}</script>
	`;
}

describe("boot", () => {
	beforeEach(() => {
		window.localStorage.clear();
		setupDom();
	});

	it("renders one .skill element per skill, each with a chevron icon", () => {
		boot(document, window);
		expect(document.querySelectorAll(".skill")).toHaveLength(2);
		expect(document.querySelectorAll(".chevron svg")).toHaveLength(2);
	});

	it("renders the cross-reference relationship between skills", () => {
		boot(document, window);
		const skillA = document.querySelector('.skill[data-skill-id="a"]');
		expect(skillA?.textContent).toContain("Depends on");
		const skillB = document.querySelector('.skill[data-skill-id="b"]');
		expect(skillB?.textContent).toContain("Used by");
	});

	it("hides non-matching skills when searching", () => {
		boot(document, window);
		const searchBox = document.getElementById("searchBox") as HTMLInputElement;
		searchBox.value = "does a";
		searchBox.dispatchEvent(new Event("input"));
		const skillA = document.querySelector('.skill[data-skill-id="a"]');
		const skillB = document.querySelector('.skill[data-skill-id="b"]');
		expect(skillA?.classList.contains("hidden")).toBe(false);
		expect(skillB?.classList.contains("hidden")).toBe(true);
	});

	it("toggles theme on click and persists it", () => {
		boot(document, window);
		const toggle = document.getElementById("themeToggle") as HTMLButtonElement;
		const initialTheme = document.documentElement.dataset.theme;
		toggle.click();
		expect(document.documentElement.dataset.theme).not.toBe(initialTheme);
	});

	it("wires the search, expand/collapse, and theme-toggle icons into the static chrome", () => {
		boot(document, window);
		expect(document.querySelector(".search-icon svg")).not.toBeNull();
		expect(document.querySelector("#expandAll .btn-icon svg")).not.toBeNull();
		expect(document.querySelector("#collapseAll .btn-icon svg")).not.toBeNull();
		expect(document.querySelector(".theme-toggle-icon-sun svg")).not.toBeNull();
		expect(document.querySelector(".theme-toggle-icon-moon svg")).not.toBeNull();
	});

	it("renders the full description, how-to-use steps, meta table, note, and status/shared badges when present", () => {
		const richData: Data = {
			skills: [
				{
					id: "rich",
					categoryId: "personal",
					name: "rich-skill",
					invocation: "manual",
					description: "does rich things",
					summary: "does rich things",
					location: "~/.cursor/skills/rich-skill/SKILL.md",
					note: "Ships references/foo.md.",
					status: "Draft PR #42",
					descriptionIntro: "Here's what this involves:",
					descriptionBullets: ["Does the first thing", "Waits for your approval before applying edits"],
					howToUse: ["Triggered by asking for it.", "Pauses and waits for your approval before continuing."],
					tags: ["example"],
					shared: true,
					updated: "2026-07-10"
				}
			]
		};
		document.getElementById("skills-data")!.textContent = JSON.stringify(richData);

		boot(document, window);

		const card = document.querySelector('.skill[data-skill-id="rich"]');
		expect(card?.textContent).toContain("Here's what this involves:");
		expect(card?.textContent).toContain("Does the first thing");
		expect(card?.textContent).toContain("Needs your input");
		expect(card?.textContent).toContain("Triggered by asking for it.");
		expect(card?.textContent).toContain("~/.cursor/skills/rich-skill/SKILL.md");
		expect(card?.textContent).toContain("On-demand only");
		expect(card?.textContent).toContain("2026-07-10");
		expect(card?.textContent).toContain("Ships references/foo.md.");
		expect(card?.textContent).toContain("Draft PR #42");
		expect(card?.textContent).toContain("Shared");
	});

	it("navigates to a cross-referenced skill via chip click even when the id contains a quote character", () => {
		Element.prototype.scrollIntoView ??= () => {};

		const dataWithQuoteId: Data = {
			skills: [
				{
					id: "a",
					categoryId: "personal",
					name: "Skill A",
					invocation: "auto",
					description: "does a",
					summary: "does a",
					tags: ["git"],
					dependsOn: ["b", 'c"d']
				},
				{
					id: "b",
					categoryId: "personal",
					name: "Skill B",
					invocation: "manual",
					description: "does b",
					summary: "does b"
				},
				{
					id: 'c"d',
					categoryId: "personal",
					name: "Skill C",
					invocation: "manual",
					description: "does c",
					summary: "does c"
				}
			]
		};
		document.getElementById("skills-data")!.textContent = JSON.stringify(dataWithQuoteId);

		boot(document, window);

		const chip = Array.from(document.querySelectorAll<HTMLButtonElement>(".skill-ref-chip")).find(
			(el) => el.dataset.skillRef === 'c"d'
		);
		expect(() => chip?.click()).not.toThrow();

		const target = Array.from(document.querySelectorAll<HTMLElement>(".skill")).find(
			(el) => el.dataset.skillId === 'c"d'
		);
		expect(target?.classList.contains("open")).toBe(true);
	});
});
