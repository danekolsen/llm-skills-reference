import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyCatalogEdits } from "../scripts/apply-catalog-edits";
import type { Config, Data, Skill } from "../src/types";

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

const baseConfig: Config = {
	categories: [{ id: "personal", name: "Personal", color: "#000", description: "d", scanPaths: ["~/.cursor/skills/**/SKILL.md"] }]
};
const baseData: Data = { skills: [makeSkill()] };

let tempDir: string;
let configPath: string;
let dataPath: string;
let payloadPath: string;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), "apply-catalog-edits-"));
	configPath = join(tempDir, "config.json");
	dataPath = join(tempDir, "data.json");
	payloadPath = join(tempDir, "payload.json");
	writeFileSync(configPath, JSON.stringify(baseConfig));
	writeFileSync(dataPath, JSON.stringify(baseData));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

function writePayload(payload: unknown): void {
	writeFileSync(payloadPath, JSON.stringify(payload));
}

function readData(): Data {
	return JSON.parse(readFileSync(dataPath, "utf-8")) as Data;
}

function readConfig(): Config {
	return JSON.parse(readFileSync(configPath, "utf-8")) as Config;
}

describe("applyCatalogEdits", () => {
	it("adds new skills and writes the exact resulting data.json", () => {
		writePayload({ additions: [makeSkill({ id: "skill-b", name: "skill-b" })] });

		const summary = applyCatalogEdits(configPath, dataPath, payloadPath);

		expect(summary.skillsAdded).toEqual(["skill-b"]);
		expect(readData()).toEqual({
			skills: [makeSkill(), makeSkill({ id: "skill-b", name: "skill-b" })]
		});
	});

	it("removes only the specified skill ids, leaving the rest untouched", () => {
		writeFileSync(dataPath, JSON.stringify({ skills: [makeSkill(), makeSkill({ id: "skill-b", name: "skill-b" })] }));
		writePayload({ removals: ["skill-b"] });

		const summary = applyCatalogEdits(configPath, dataPath, payloadPath);

		expect(summary.skillsRemoved).toEqual(["skill-b"]);
		expect(readData()).toEqual({ skills: [makeSkill()] });
	});

	it("adds a new category with its scanPaths", () => {
		writePayload({
			newCategories: [{ id: "on-prem", name: "On-Prem", color: "#50e3c2", description: "d", scanPaths: ["on-prem/.claude/skills/**/SKILL.md"] }]
		});

		const summary = applyCatalogEdits(configPath, dataPath, payloadPath);

		expect(summary.categoriesAdded).toEqual(["on-prem"]);
		expect(readConfig().categories).toEqual([
			...baseConfig.categories,
			{ id: "on-prem", name: "On-Prem", color: "#50e3c2", description: "d", scanPaths: ["on-prem/.claude/skills/**/SKILL.md"] }
		]);
	});

	it("appends new scanPaths to an existing category and dedupes ones already present", () => {
		writePayload({
			scanPathAdditions: [{ categoryId: "personal", scanPaths: ["~/.cursor/skills/**/SKILL.md", "~/.cursor/skills-cursor/**/SKILL.md"] }]
		});

		const summary = applyCatalogEdits(configPath, dataPath, payloadPath);

		expect(summary.scanPathsAdded).toEqual([{ categoryId: "personal", scanPaths: ["~/.cursor/skills-cursor/**/SKILL.md"] }]);
		expect(readConfig().categories[0]?.scanPaths).toEqual([
			"~/.cursor/skills/**/SKILL.md",
			"~/.cursor/skills-cursor/**/SKILL.md"
		]);
	});

	it("merges update changes into an existing skill without disturbing other fields", () => {
		writePayload({ updates: [{ id: "skill-a", changes: { description: "new desc", status: "Draft PR #42" } }] });

		const summary = applyCatalogEdits(configPath, dataPath, payloadPath);

		expect(summary.skillsUpdated).toEqual(["skill-a"]);
		expect(readData()).toEqual({ skills: [makeSkill({ description: "new desc", status: "Draft PR #42" })] });
	});

	it("reassigns a skill's categoryId and records the before/after in the summary", () => {
		writeFileSync(
			configPath,
			JSON.stringify({
				categories: [
					...baseConfig.categories,
					{ id: "frontend", name: "Frontend", color: "#f93e3e", description: "d", scanPaths: [] }
				]
			})
		);
		writePayload({ categoryReassignments: [{ skillId: "skill-a", categoryId: "frontend" }] });

		const summary = applyCatalogEdits(configPath, dataPath, payloadPath);

		expect(summary.skillsReassigned).toEqual([{ skillId: "skill-a", from: "personal", to: "frontend" }]);
		expect(readData().skills[0]?.categoryId).toBe("frontend");
	});

	it("applies every bucket from one combined payload and produces the exact expected catalog", () => {
		writeFileSync(dataPath, JSON.stringify({ skills: [makeSkill(), makeSkill({ id: "skill-stale", name: "skill-stale" })] }));
		writePayload({
			newCategories: [{ id: "on-prem", name: "On-Prem", color: "#50e3c2", description: "d", scanPaths: [] }],
			scanPathAdditions: [{ categoryId: "on-prem", scanPaths: ["on-prem/.claude/skills/**/SKILL.md"] }],
			additions: [makeSkill({ id: "skill-new", categoryId: "on-prem", name: "skill-new" })],
			updates: [{ id: "skill-a", changes: { description: "updated desc" } }],
			removals: ["skill-stale"]
		});

		const summary = applyCatalogEdits(configPath, dataPath, payloadPath);

		expect(summary).toEqual({
			categoriesAdded: ["on-prem"],
			scanPathsAdded: [{ categoryId: "on-prem", scanPaths: ["on-prem/.claude/skills/**/SKILL.md"] }],
			skillsAdded: ["skill-new"],
			skillsRemoved: ["skill-stale"],
			skillsUpdated: ["skill-a"],
			skillsReassigned: []
		});
		expect(readConfig()).toEqual({
			categories: [
				...baseConfig.categories,
				{ id: "on-prem", name: "On-Prem", color: "#50e3c2", description: "d", scanPaths: ["on-prem/.claude/skills/**/SKILL.md"] }
			]
		});
		expect(readData()).toEqual({
			skills: [makeSkill({ description: "updated desc" }), makeSkill({ id: "skill-new", categoryId: "on-prem", name: "skill-new" })]
		});
	});

	it("does not write either file when dryRun is set, but still returns the summary", () => {
		writePayload({ additions: [makeSkill({ id: "skill-b", name: "skill-b" })] });

		const summary = applyCatalogEdits(configPath, dataPath, payloadPath, { dryRun: true });

		expect(summary.skillsAdded).toEqual(["skill-b"]);
		expect(readData()).toEqual(baseData);
	});

	it("throws and leaves files untouched when an addition references an unknown categoryId", () => {
		writePayload({ additions: [makeSkill({ id: "skill-b", name: "skill-b", categoryId: "ghost-category" })] });

		expect(() => applyCatalogEdits(configPath, dataPath, payloadPath)).toThrow(/unknown categoryId "ghost-category"/);
		expect(readData()).toEqual(baseData);
	});

	it("throws when an addition would duplicate an existing skill id", () => {
		writePayload({ additions: [makeSkill()] });

		expect(() => applyCatalogEdits(configPath, dataPath, payloadPath)).toThrow(/"skill-a": a skill with that id already exists/);
		expect(readData()).toEqual(baseData);
	});

	it("throws when a removal targets a skill id that doesn't exist", () => {
		writePayload({ removals: ["ghost-skill"] });

		expect(() => applyCatalogEdits(configPath, dataPath, payloadPath)).toThrow(/Cannot remove unknown skill "ghost-skill"/);
		expect(readData()).toEqual(baseData);
	});

	it("throws when a scanPathAddition targets an unknown category", () => {
		writePayload({ scanPathAdditions: [{ categoryId: "ghost-category", scanPaths: ["x/**/SKILL.md"] }] });

		expect(() => applyCatalogEdits(configPath, dataPath, payloadPath)).toThrow(/unknown category "ghost-category"/);
		expect(readConfig()).toEqual(baseConfig);
	});

	it("throws when an addition's dependsOn references a skill outside the payload and not already in the catalog", () => {
		writePayload({ additions: [makeSkill({ id: "skill-b", name: "skill-b", dependsOn: ["ghost-dependency"] })] });

		expect(() => applyCatalogEdits(configPath, dataPath, payloadPath)).toThrow(/depends on unknown skill "ghost-dependency"/);
		expect(readData()).toEqual(baseData);
	});
});
