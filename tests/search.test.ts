import { describe, expect, it } from "vitest";
import { collectAllTags, filterSkills } from "../src/search";
import type { Skill } from "../src/types";

function makeSkill(overrides: Partial<Skill>): Skill {
	return {
		id: "skill-a",
		categoryId: "personal",
		name: "skill-a",
		invocation: "auto",
		description: "does a thing",
		summary: "does a thing",
		tags: [],
		...overrides
	};
}

describe("filterSkills", () => {
	it("returns all skills for an empty query", () => {
		const skills = [makeSkill({}), makeSkill({ id: "skill-b", name: "skill-b" })];
		expect(filterSkills(skills, "")).toHaveLength(2);
	});

	it("matches on name case-insensitively", () => {
		const skills = [makeSkill({ name: "regression-tracer" })];
		expect(filterSkills(skills, "REGRESSION")).toHaveLength(1);
	});

	it("matches on tags", () => {
		const skills = [makeSkill({ tags: ["git", "debugging"] })];
		expect(filterSkills(skills, "debugging")).toHaveLength(1);
	});

	it("excludes non-matching skills", () => {
		const skills = [makeSkill({ name: "skill-a" })];
		expect(filterSkills(skills, "nonexistent")).toHaveLength(0);
	});

	it("filters to skills that have every active tag (AND semantics)", () => {
		const skills = [
			makeSkill({ id: "a", tags: ["git", "debugging"] }),
			makeSkill({ id: "b", tags: ["git"] }),
			makeSkill({ id: "c", tags: ["debugging"] })
		];
		expect(filterSkills(skills, "", ["git", "debugging"]).map((s) => s.id)).toEqual(["a"]);
		expect(filterSkills(skills, "", ["git"]).map((s) => s.id)).toEqual(["a", "b"]);
	});

	it("combines the text query and active tags with AND", () => {
		const skills = [
			makeSkill({ id: "a", name: "regression-tracer", tags: ["git"] }),
			makeSkill({ id: "b", name: "other-skill", tags: ["git"] })
		];
		expect(filterSkills(skills, "regression", ["git"]).map((s) => s.id)).toEqual(["a"]);
	});

	it("treats an empty active-tags list as no tag filter", () => {
		const skills = [makeSkill({ id: "a", tags: ["git"] })];
		expect(filterSkills(skills, "", [])).toHaveLength(1);
	});
});

describe("collectAllTags", () => {
	it("returns the sorted set of unique tags across all skills", () => {
		const skills = [
			makeSkill({ id: "a", tags: ["git", "debugging"] }),
			makeSkill({ id: "b", tags: ["git", "review"] }),
			makeSkill({ id: "c", tags: [] })
		];
		expect(collectAllTags(skills)).toEqual(["debugging", "git", "review"]);
	});

	it("returns an empty array when no skills have tags", () => {
		const skills = [makeSkill({ id: "a" })];
		expect(collectAllTags(skills)).toEqual([]);
	});
});
