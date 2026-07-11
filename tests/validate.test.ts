import { describe, expect, it } from "vitest";
import { validateData } from "../src/validate";
import type { Config, Data, Skill } from "../src/types";

const baseConfig: Config = {
	categories: [{ id: "personal", name: "Personal", color: "#000", description: "d", scanPaths: [] }]
};

function makeSkill(overrides: Partial<Skill> = {}): Skill {
	return {
		id: "skill-a",
		categoryId: "personal",
		name: "skill-a",
		invocation: "auto",
		description: "desc",
		summary: "sum",
		...overrides
	};
}

describe("validateData", () => {
	it("returns no errors for valid data", () => {
		const data: Data = { skills: [makeSkill()] };
		expect(validateData(baseConfig, data)).toEqual([]);
	});

	it("flags an unknown categoryId", () => {
		const data: Data = { skills: [makeSkill({ categoryId: "missing" })] };
		expect(validateData(baseConfig, data)).toEqual([
			{ message: 'Skill "skill-a" has unknown categoryId "missing"' }
		]);
	});

	it("flags a dangling dependsOn reference", () => {
		const data: Data = { skills: [makeSkill({ dependsOn: ["ghost"] })] };
		expect(validateData(baseConfig, data)).toEqual([
			{ message: 'Skill "skill-a" depends on unknown skill "ghost"' }
		]);
	});

	it("flags a missing required field", () => {
		const data: Data = { skills: [makeSkill({ summary: "" })] };
		expect(validateData(baseConfig, data)).toEqual([
			{ message: 'Skill "skill-a" is missing required field "summary"' }
		]);
	});
});
