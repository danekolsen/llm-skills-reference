import { describe, expect, it } from "vitest";
import { deriveUsedBy } from "../src/derive";
import type { Skill } from "../src/types";

function makeSkill(id: string, dependsOn: string[] = []): Skill {
	return { id, categoryId: "personal", name: id, invocation: "auto", description: "d", summary: "s", dependsOn };
}

describe("deriveUsedBy", () => {
	it("maps each dependency to the skills that depend on it", () => {
		const skills = [makeSkill("a", ["b"]), makeSkill("b"), makeSkill("c", ["b"])];
		expect(deriveUsedBy(skills).get("b")).toEqual(["a", "c"]);
	});

	it("returns an empty map when nothing declares dependsOn", () => {
		const skills = [makeSkill("a"), makeSkill("b")];
		expect(deriveUsedBy(skills).size).toBe(0);
	});
});
