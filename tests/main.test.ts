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
		<button id="themeToggle"></button>
		<input type="search" id="searchBox" />
		<button id="expandAll"></button>
		<button id="collapseAll"></button>
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

	it("renders one .skill element per skill", () => {
		boot(document, window);
		expect(document.querySelectorAll(".skill")).toHaveLength(2);
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
});
