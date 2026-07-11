// @vitest-environment node
//
// This suite invokes esbuild (via runBuild), which is incompatible with the jsdom
// environment used by default in vitest.config.ts: jsdom's global TextEncoder breaks
// esbuild's internal sanity check ("new TextEncoder().encode('') instanceof Uint8Array").
// Running this file under the plain node environment avoids that collision.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runBuild } from "../scripts/build";

const validConfig = {
	categories: [{ id: "personal", name: "Personal", color: "#000", description: "d", scanPaths: [] }]
};
const validData = {
	skills: [{ id: "a", categoryId: "personal", name: "Skill A", invocation: "auto", description: "d", summary: "s" }]
};

let tempDir: string;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), "skills-reference-build-"));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

describe("runBuild", () => {
	it("produces a dist/index.html embedding the config and data", async () => {
		const configPath = join(tempDir, "config.json");
		const dataPath = join(tempDir, "data.json");
		const outPath = join(tempDir, "dist", "index.html");
		writeFileSync(configPath, JSON.stringify(validConfig));
		writeFileSync(dataPath, JSON.stringify(validData));

		await runBuild(configPath, dataPath, outPath);

		const html = readFileSync(outPath, "utf-8");
		expect(html).toContain("Skill A");
		expect(html).toContain('id="config-data"');
		expect(html).toContain('id="skills-data"');
	});

	it("throws with a clear message when data references an unknown category", async () => {
		const configPath = join(tempDir, "config.json");
		const dataPath = join(tempDir, "data.json");
		const outPath = join(tempDir, "dist", "index.html");
		writeFileSync(configPath, JSON.stringify(validConfig));
		writeFileSync(dataPath, JSON.stringify({ skills: [{ ...validData.skills[0], categoryId: "ghost-category" }] }));

		await expect(runBuild(configPath, dataPath, outPath)).rejects.toThrow(/unknown categoryId "ghost-category"/);
	});

	it("does not corrupt embedded JSON or the app script when skill text contains a placeholder token literal", async () => {
		const configPath = join(tempDir, "config.json");
		const dataPath = join(tempDir, "data.json");
		const outPath = join(tempDir, "dist", "index.html");
		writeFileSync(configPath, JSON.stringify(validConfig));
		const trickyData = {
			skills: [
				{
					...validData.skills[0],
					name: "Skill mentioning __DATA_JSON__ and __APP_JS__ as literal text",
					description: "This skill's description literally contains __STYLES__ and __CONFIG_JSON__ tokens."
				}
			]
		};
		writeFileSync(dataPath, JSON.stringify(trickyData));

		await runBuild(configPath, dataPath, outPath);

		const html = readFileSync(outPath, "utf-8");

		const skillsDataMatch = html.match(/<script type="application\/json" id="skills-data">([\s\S]*?)<\/script>/);
		expect(skillsDataMatch).not.toBeNull();
		const embeddedData = JSON.parse(skillsDataMatch![1]!) as typeof trickyData;
		expect(embeddedData.skills[0]!.name).toBe(trickyData.skills[0]!.name);
		expect(embeddedData.skills[0]!.description).toBe(trickyData.skills[0]!.description);

		const appScriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
		expect(appScriptMatch).not.toBeNull();
		expect(appScriptMatch![1]!.length).toBeGreaterThan(0);
	});
});
