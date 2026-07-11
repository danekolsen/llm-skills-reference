import { describe, expect, it } from "vitest";
import { renderCategoryHeader, renderCrossReferences, renderTagChips } from "../src/render";
import type { Category, Skill } from "../src/types";

function makeSkill(overrides: Partial<Skill>): Skill {
	return {
		id: "skill-a",
		categoryId: "personal",
		name: "Skill A",
		invocation: "auto",
		description: "d",
		summary: "s",
		...overrides
	};
}

describe("renderTagChips", () => {
	it("renders one chip per tag", () => {
		const html = renderTagChips(["git", "debugging"]);
		expect(html).toContain('<span class="tag-chip">git</span>');
		expect(html).toContain('<span class="tag-chip">debugging</span>');
	});

	it("renders nothing for undefined tags", () => {
		expect(renderTagChips(undefined)).toBe("");
	});
});

describe("renderCrossReferences", () => {
	it("renders both depends-on and used-by blocks", () => {
		const a = makeSkill({ id: "a", name: "Skill A", dependsOn: ["b"] });
		const b = makeSkill({ id: "b", name: "Skill B" });
		const skillsById = new Map([
			["a", a],
			["b", b]
		]);
		const usedBy = new Map([["b", ["a"]]]);

		const htmlForA = renderCrossReferences(a, usedBy, skillsById);
		expect(htmlForA).toContain("Depends on");
		expect(htmlForA).toContain('data-skill-ref="b"');

		const htmlForB = renderCrossReferences(b, usedBy, skillsById);
		expect(htmlForB).toContain("Used by");
		expect(htmlForB).toContain('data-skill-ref="a"');
	});

	it("renders nothing when there are no relationships", () => {
		const a = makeSkill({ id: "a" });
		expect(renderCrossReferences(a, new Map(), new Map([["a", a]]))).toBe("");
	});
});

describe("renderCategoryHeader", () => {
	it("includes the category name and skill count", () => {
		const category: Category = { id: "personal", name: "Personal", color: "#61affe", description: "desc", scanPaths: [] };
		const html = renderCategoryHeader(category, 3);
		expect(html).toContain("Personal");
		expect(html).toContain("3 skills");
	});
});
