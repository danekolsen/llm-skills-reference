import { describe, expect, it } from "vitest";
import {
	escapeHtml,
	renderCategoryHeader,
	renderCrossReferences,
	renderDescriptionBody,
	renderExtraBadges,
	renderHowToUse,
	renderMetaTable,
	renderNote,
	renderTagChips
} from "../src/render";
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

describe("escapeHtml", () => {
	it("escapes double and single quote characters", () => {
		const html = escapeHtml(`foo" onmouseover="alert(1)' x='y`);
		expect(html).not.toContain('"');
		expect(html).not.toContain("'");
		expect(html).toContain("&quot;");
		expect(html).toContain("&#39;");
	});
});

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

	it("escapes a malicious color value instead of breaking out of the style attribute", () => {
		const category: Category = {
			id: "personal",
			name: "Personal",
			color: `red" onmouseover="alert(1)`,
			description: "desc",
			scanPaths: []
		};
		const html = renderCategoryHeader(category, 1);
		expect(html).toContain("&quot;");
		expect(html).not.toContain('background:red" onmouseover="alert(1)');
	});
});

describe("renderDescriptionBody", () => {
	it("renders an intro paragraph plus a bullet list when descriptionBullets is set", () => {
		const skill = makeSkill({
			description: "ignored when bullets are present",
			descriptionIntro: "Here's what this involves:",
			descriptionBullets: ["Does the first thing", "Does the **second** thing"]
		});
		const html = renderDescriptionBody(skill);
		expect(html).toContain("Here&#39;s what this involves:");
		expect(html).toContain("<li>Does the first thing</li>");
		expect(html).toContain("<li>Does the <strong>second</strong> thing</li>");
	});

	it("falls back to markdown-lite rendering of the raw description when there are no bullets", () => {
		const skill = makeSkill({ description: "First paragraph.\n\nSecond **bold** paragraph." });
		const html = renderDescriptionBody(skill);
		expect(html).toContain("<p>First paragraph.</p>");
		expect(html).toContain("<p>Second <strong>bold</strong> paragraph.</p>");
	});

	it("renders a bullet list from lines starting with '- ' in the raw description", () => {
		const skill = makeSkill({ description: "- first item\n- second item" });
		const html = renderDescriptionBody(skill);
		expect(html).toContain("<ul><li>first item</li><li>second item</li></ul>");
	});

	it("renders nothing when the description is identical to the summary", () => {
		const skill = makeSkill({ description: "Same text.", summary: "Same text." });
		expect(renderDescriptionBody(skill)).toBe("");
	});

	it("escapes HTML in the raw description", () => {
		const skill = makeSkill({ description: `<img src=x onerror="alert(1)">`, summary: "s" });
		const html = renderDescriptionBody(skill);
		expect(html).not.toContain("<img");
		expect(html).toContain("&lt;img");
	});

	it("escapes an HTML/attribute-injection payload wrapped in bold markers, rather than unwrapping it unescaped", () => {
		const skill = makeSkill({
			description: "ignored",
			descriptionBullets: [`**<img src=x onerror="alert(1)">**`]
		});
		const html = renderDescriptionBody(skill);
		expect(html).not.toContain("<img");
		expect(html).not.toContain('onerror="alert(1)"');
		expect(html).toContain("<strong>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</strong>");
	});
});

describe("renderHowToUse", () => {
	it("renders nothing when howToUse is absent or empty", () => {
		expect(renderHowToUse(makeSkill({}))).toBe("");
		expect(renderHowToUse(makeSkill({ howToUse: [] }))).toBe("");
	});

	it("renders a single step as a plain paragraph, not a list", () => {
		const html = renderHowToUse(makeSkill({ howToUse: ["Just run it."] }));
		expect(html).toContain('<p class="autonomous-note">Just run it.</p>');
		expect(html).not.toContain("<ol>");
	});

	it("renders multiple steps as a numbered list, tagging steps that need user input", () => {
		const html = renderHowToUse(
			makeSkill({
				howToUse: ["Walks the skill folders automatically.", "Pauses and waits for your approval before applying edits."]
			})
		);
		expect(html).toContain("<ol>");
		expect(html).toContain("Needs your input");
		const [firstStepHtml, secondStepHtml] = html.split("</li>");
		expect(firstStepHtml).not.toContain("Needs your input");
		expect(secondStepHtml).toContain("Needs your input");
	});

	it("escapes HTML in step text", () => {
		const html = renderHowToUse(makeSkill({ howToUse: [`<script>alert(1)</script>`, "second step"] }));
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("escapes an HTML/attribute-injection payload wrapped in bold markers in a single step", () => {
		const html = renderHowToUse(makeSkill({ howToUse: [`**<img src=x onerror="alert(1)">**`] }));
		expect(html).not.toContain("<img");
		expect(html).not.toContain('onerror="alert(1)"');
		expect(html).toContain("<strong>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</strong>");
	});
});

describe("renderMetaTable", () => {
	it("always renders the invocation row", () => {
		const html = renderMetaTable(makeSkill({ invocation: "auto" }));
		expect(html).toContain("Invocation");
		expect(html).toContain("Auto-discoverable");
	});

	it("renders the manual invocation explanation", () => {
		const html = renderMetaTable(makeSkill({ invocation: "manual" }));
		expect(html).toContain("On-demand only");
	});

	it("renders a location row only when location is set", () => {
		expect(renderMetaTable(makeSkill({}))).not.toContain("Location");
		const html = renderMetaTable(makeSkill({ location: "~/.cursor/skills/foo/SKILL.md" }));
		expect(html).toContain("Location");
		expect(html).toContain("<code>~/.cursor/skills/foo/SKILL.md</code>");
	});

	it("renders an updated badge row only when updated is set", () => {
		expect(renderMetaTable(makeSkill({}))).not.toContain("Updated");
		const html = renderMetaTable(makeSkill({ updated: "2026-07-10" }));
		expect(html).toContain("Updated");
		expect(html).toContain("2026-07-10");
	});

	it("escapes a malicious location value", () => {
		const html = renderMetaTable(makeSkill({ location: `</code><script>alert(1)</script>` }));
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;/code&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
	});
});

describe("renderNote", () => {
	it("renders nothing when note is absent", () => {
		expect(renderNote(makeSkill({}))).toBe("");
	});

	it("renders the note text", () => {
		const html = renderNote(makeSkill({ note: "Pending PR #123." }));
		expect(html).toContain("Pending PR #123.");
		expect(html).toContain("pending-note");
	});

	it("escapes HTML in the note", () => {
		const html = renderNote(makeSkill({ note: `<img src=x onerror="alert(1)">` }));
		expect(html).not.toContain("<img");
		expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
	});
});

describe("renderExtraBadges", () => {
	it("renders nothing when status and shared are absent", () => {
		expect(renderExtraBadges(makeSkill({}))).toBe("");
	});

	it("renders a status badge with escaped text", () => {
		const html = renderExtraBadges(makeSkill({ status: `Draft" onmouseover="alert(1)` }));
		expect(html).toContain("badge status");
		expect(html).toContain("&quot;");
		expect(html).not.toContain('Draft" onmouseover="alert(1)');
	});

	it("renders a shared badge when shared is true", () => {
		const html = renderExtraBadges(makeSkill({ shared: true }));
		expect(html).toContain("badge shared");
		expect(html).toContain("Shared");
	});

	it("renders nothing for a shared badge when shared is false", () => {
		expect(renderExtraBadges(makeSkill({ shared: false }))).toBe("");
	});
});
