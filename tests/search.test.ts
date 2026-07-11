import { describe, expect, it } from "vitest";
import { filterSkills } from "../src/search";
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
});
