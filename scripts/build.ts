import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { validateData } from "../src/validate";
import type { Config, Data } from "../src/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function escapeForInlineScript(raw: string): string {
	return raw.replace(/<\/script/gi, "<\\/script");
}

export async function runBuild(configPath: string, dataPath: string, outPath: string): Promise<void> {
	const config = JSON.parse(readFileSync(configPath, "utf-8")) as Config;
	const data = JSON.parse(readFileSync(dataPath, "utf-8")) as Data;

	const errors = validateData(config, data);
	if (errors.length > 0) {
		const message = errors.map((error) => `  - ${error.message}`).join("\n");
		throw new Error(`skills-reference build failed validation:\n${message}`);
	}

	const bundleResult = await esbuild.build({
		entryPoints: [resolve(ROOT, "src/main.ts")],
		bundle: true,
		write: false,
		format: "iife",
		target: "es2020"
	});
	const outputFile = bundleResult.outputFiles[0];
	if (!outputFile) {
		throw new Error("esbuild produced no output for src/main.ts");
	}

	const styles = readFileSync(resolve(ROOT, "src/styles.css"), "utf-8");
	const template = readFileSync(resolve(ROOT, "src/template.html"), "utf-8");

	// A single-pass regex replace (not sequential .replace() calls) so that JSON/CSS/JS content
	// embedded by one substitution can never accidentally contain another placeholder token and
	// have that token matched and corrupted by a later substitution.
	const replacements: Record<string, string> = {
		__STYLES__: styles,
		__CONFIG_JSON__: escapeForInlineScript(JSON.stringify(config)),
		__DATA_JSON__: escapeForInlineScript(JSON.stringify(data)),
		__APP_JS__: escapeForInlineScript(outputFile.text)
	};
	const html = template.replace(/__STYLES__|__CONFIG_JSON__|__DATA_JSON__|__APP_JS__/g, (token) => replacements[token] ?? token);

	mkdirSync(dirname(outPath), { recursive: true });
	writeFileSync(outPath, html, "utf-8");
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
	runBuild(resolve(ROOT, "config.json"), resolve(ROOT, "data.json"), resolve(ROOT, "dist/index.html"))
		.then(() => {
			console.log("Built dist/index.html");
		})
		.catch((error: unknown) => {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		});
}
