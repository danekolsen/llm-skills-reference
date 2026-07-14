import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateData } from "../src/validate";
import type { Category, Config, Data, Skill } from "../src/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The `update-skills-doc` skill's grouped review resolves to exactly one of these six
 * operations per discrepancy bucket (see skills/update-skills-doc/SKILL.md, "Diff into the
 * six buckets"). A payload is a batch of already-approved operations — this script never
 * decides what belongs in it, it only applies it safely.
 *
 *   (0) MISSING SCAN LOCATION -> newCategories | scanPathAdditions
 *   (a) ADD                   -> additions
 *   (b) CATALOG-ONLY          -> removals (only ids the user explicitly approved removing)
 *   (c) BADGE/STATUS drift    -> updates
 *   (d) DESCRIPTION drift     -> updates
 *   (e) CATEGORY SCOPE drift  -> categoryReassignments (plus newCategories for the split halves)
 */
export interface ScanPathAddition {
	categoryId: string;
	scanPaths: string[];
}

export interface SkillUpdate {
	id: string;
	changes: Partial<Omit<Skill, "id">>;
}

export interface CategoryReassignment {
	skillId: string;
	categoryId: string;
}

export interface CatalogEditsPayload {
	newCategories?: Category[];
	scanPathAdditions?: ScanPathAddition[];
	additions?: Skill[];
	removals?: string[];
	updates?: SkillUpdate[];
	categoryReassignments?: CategoryReassignment[];
}

export interface ApplySummary {
	categoriesAdded: string[];
	scanPathsAdded: ScanPathAddition[];
	skillsAdded: string[];
	skillsRemoved: string[];
	skillsUpdated: string[];
	skillsReassigned: { skillId: string; from: string; to: string }[];
}

export interface ApplyOptions {
	dryRun?: boolean;
}

function readJsonFile<T>(path: string): T {
	let raw: string;
	try {
		raw = readFileSync(path, "utf-8");
	} catch (error) {
		throw new Error(`Failed to read ${path}: ${error instanceof Error ? error.message : String(error)}`);
	}
	try {
		return JSON.parse(raw) as T;
	} catch (error) {
		throw new Error(`Failed to parse ${path} as JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
}

function writeJsonFile(path: string, value: unknown): void {
	writeFileSync(path, `${JSON.stringify(value, null, "\t")}\n`, "utf-8");
}

/**
 * Mutates `config` and `data` in place, applying every operation present in `payload`, in a
 * fixed order chosen so later steps can reference what earlier steps just created (e.g. a
 * scanPathAddition targeting a category from this same payload's newCategories). Throws
 * before mutating further if a referenced id doesn't exist — callers should treat any throw
 * as "nothing should be considered applied", which is why `applyCatalogEdits` below only
 * writes to disk after this function returns successfully.
 */
function mutate(config: Config, data: Data, payload: CatalogEditsPayload): ApplySummary {
	const summary: ApplySummary = {
		categoriesAdded: [],
		scanPathsAdded: [],
		skillsAdded: [],
		skillsRemoved: [],
		skillsUpdated: [],
		skillsReassigned: []
	};

	for (const category of payload.newCategories ?? []) {
		if (config.categories.some((existing) => existing.id === category.id)) {
			throw new Error(`Cannot add category "${category.id}": a category with that id already exists`);
		}
		config.categories.push(category);
		summary.categoriesAdded.push(category.id);
	}

	for (const addition of payload.scanPathAdditions ?? []) {
		const category = config.categories.find((existing) => existing.id === addition.categoryId);
		if (!category) {
			throw new Error(`Cannot add scanPaths to unknown category "${addition.categoryId}"`);
		}
		const newPaths = addition.scanPaths.filter((path) => !category.scanPaths.includes(path));
		category.scanPaths.push(...newPaths);
		if (newPaths.length > 0) {
			summary.scanPathsAdded.push({ categoryId: addition.categoryId, scanPaths: newPaths });
		}
	}

	for (const reassignment of payload.categoryReassignments ?? []) {
		const skill = data.skills.find((existing) => existing.id === reassignment.skillId);
		if (!skill) {
			throw new Error(`Cannot reassign unknown skill "${reassignment.skillId}"`);
		}
		const from = skill.categoryId;
		skill.categoryId = reassignment.categoryId;
		summary.skillsReassigned.push({ skillId: reassignment.skillId, from, to: reassignment.categoryId });
	}

	for (const update of payload.updates ?? []) {
		const skill = data.skills.find((existing) => existing.id === update.id);
		if (!skill) {
			throw new Error(`Cannot update unknown skill "${update.id}"`);
		}
		Object.assign(skill, update.changes);
		summary.skillsUpdated.push(update.id);
	}

	const removalIds = new Set(payload.removals ?? []);
	for (const id of removalIds) {
		if (!data.skills.some((skill) => skill.id === id)) {
			throw new Error(`Cannot remove unknown skill "${id}"`);
		}
	}
	if (removalIds.size > 0) {
		data.skills = data.skills.filter((skill) => !removalIds.has(skill.id));
		summary.skillsRemoved.push(...removalIds);
	}

	for (const addition of payload.additions ?? []) {
		if (data.skills.some((existing) => existing.id === addition.id)) {
			throw new Error(`Cannot add skill "${addition.id}": a skill with that id already exists`);
		}
		data.skills.push(addition);
		summary.skillsAdded.push(addition.id);
	}

	return summary;
}

/**
 * Reads config.json/data.json and a payload of approved catalog edits, applies every
 * operation in the payload, validates the result with the same rules `npm run build` enforces,
 * and — only if validation passes — writes config.json/data.json back to disk (skipped
 * entirely when `options.dryRun` is set, so a caller can preview the exact resulting summary
 * before committing to it). A validation failure leaves both files untouched.
 */
export function applyCatalogEdits(
	configPath: string,
	dataPath: string,
	payloadPath: string,
	options: ApplyOptions = {}
): ApplySummary {
	const config = readJsonFile<Config>(configPath);
	const data = readJsonFile<Data>(dataPath);
	const payload = readJsonFile<CatalogEditsPayload>(payloadPath);

	const summary = mutate(config, data, payload);

	const errors = validateData(config, data);
	if (errors.length > 0) {
		const message = errors.map((error) => `  - ${error.message}`).join("\n");
		throw new Error(`apply-catalog-edits produced an invalid catalog:\n${message}`);
	}

	if (!options.dryRun) {
		writeJsonFile(configPath, config);
		writeJsonFile(dataPath, data);
	}

	return summary;
}

function printSummary(summary: ApplySummary, dryRun: boolean): void {
	const lines: string[] = [];
	if (summary.categoriesAdded.length > 0) lines.push(`Categories added: ${summary.categoriesAdded.join(", ")}`);
	for (const entry of summary.scanPathsAdded) {
		lines.push(`ScanPaths added to "${entry.categoryId}": ${entry.scanPaths.join(", ")}`);
	}
	if (summary.skillsAdded.length > 0) lines.push(`Skills added: ${summary.skillsAdded.join(", ")}`);
	if (summary.skillsUpdated.length > 0) lines.push(`Skills updated: ${summary.skillsUpdated.join(", ")}`);
	if (summary.skillsRemoved.length > 0) lines.push(`Skills removed: ${summary.skillsRemoved.join(", ")}`);
	for (const entry of summary.skillsReassigned) {
		lines.push(`Skill "${entry.skillId}" reassigned: ${entry.from} -> ${entry.to}`);
	}
	if (lines.length === 0) {
		lines.push("No changes (empty payload).");
	}
	console.log(lines.join("\n"));
	console.log(dryRun ? "\n(dry run — config.json/data.json were not written)" : "\nWrote config.json and data.json.");
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const payloadArg = args.find((arg) => !arg.startsWith("--"));

	if (!payloadArg) {
		console.error("Usage: tsx scripts/apply-catalog-edits.ts <payload.json> [--dry-run]");
		process.exitCode = 1;
	} else {
		try {
			const summary = applyCatalogEdits(
				resolve(ROOT, "config.json"),
				resolve(ROOT, "data.json"),
				resolve(process.cwd(), payloadArg),
				{ dryRun }
			);
			printSummary(summary, dryRun);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	}
}
