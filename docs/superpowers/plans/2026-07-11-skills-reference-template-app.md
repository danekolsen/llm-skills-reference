# Skills Reference Template App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, portable, config-driven template app that replaces the single embedded-JS `skills-reference.html` catalog with a JSON-backed viewer supporting light/dark theming and skill-to-skill dependency cross-references.

**Architecture:** A vanilla TypeScript browser app (`src/`) renders two JSON files (`config.json` for categories, `data.json` for skills) that a Node build script (`scripts/build.ts`) validates and inlines — together with the bundled app JS and CSS — into a single dependency-free `dist/index.html`. That file can be opened directly via `file://`, served locally, or deployed to any static host without changes.

**Tech Stack:** TypeScript (strict), esbuild (bundling), tsx (running TS scripts directly), Vitest + jsdom (testing). No UI framework, no runtime dependencies in the shipped output.

---

## Reference: full spec

See `docs/superpowers/specs/2026-07-11-skills-reference-app-design.md` for the full design rationale. This plan implements that spec exactly; nothing here should contradict it.

## File structure this plan produces

```
skills-reference/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── config.json                # example/template category config
├── data.json                  # example/template skill data
├── SCHEMA.md
├── README.md
├── src/
│   ├── types.ts               # Category, Config, Skill, Data types
│   ├── validate.ts            # validateData()
│   ├── derive.ts               # deriveUsedBy()
│   ├── search.ts               # buildSearchText(), filterSkills()
│   ├── theme.ts                # getPreferredTheme(), readStoredTheme(), writeStoredTheme()
│   ├── render.ts                # escapeHtml(), renderTagChips(), renderCrossReferences(), renderCategoryHeader()
│   ├── main.ts                  # renderSkillsIntoContainer(), wireInteractions(), wireTheme(), boot()
│   ├── styles.css
│   └── template.html
├── scripts/
│   ├── build.ts                 # runBuild()
│   └── dev-server.ts
├── tests/
│   ├── validate.test.ts
│   ├── derive.test.ts
│   ├── search.test.ts
│   ├── theme.test.ts
│   ├── render.test.ts
│   ├── main.test.ts
│   └── build.test.ts
└── dist/
    └── index.html              # generated, gitignored
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
	"name": "skills-reference",
	"version": "0.1.0",
	"private": true,
	"type": "module",
	"scripts": {
		"dev": "tsx scripts/dev-server.ts",
		"build": "tsx scripts/build.ts",
		"test": "vitest run",
		"typecheck": "tsc --noEmit"
	}
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install --save-dev typescript esbuild tsx vitest jsdom`
Expected: `package.json` gains a `devDependencies` block and a `package-lock.json` is created; exit code 0.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
	"compilerOptions": {
		"target": "ES2020",
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"lib": ["ES2020", "DOM"],
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"noEmit": true
	},
	"include": ["src", "scripts", "tests"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom"
	}
});
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 6: Verify typecheck runs cleanly with no source files yet**

Run: `npm run typecheck`
Expected: exits 0 with no output (nothing to type-check yet, but confirms the toolchain is wired correctly).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: scaffold project tooling (typescript, esbuild, tsx, vitest)"
```

---

### Task 2: Shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```typescript
export type Invocation = "auto" | "manual";

export interface Category {
	id: string;
	name: string;
	color: string;
	description: string;
	scanPaths: string[];
}

export interface Config {
	categories: Category[];
}

export interface Skill {
	id: string;
	categoryId: string;
	name: string;
	invocation: Invocation;
	description: string;
	summary: string;
	location?: string;
	note?: string;
	status?: string;
	descriptionIntro?: string;
	descriptionBullets?: string[];
	howToUse?: string[];
	tags?: string[];
	interactive?: boolean;
	shared?: boolean;
	updated?: string;
	dependsOn?: string[];
}

export interface Data {
	skills: Skill[];
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exits 0 with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared Category/Config/Skill/Data types"
```

---

### Task 3: Validation logic

**Files:**
- Create: `src/validate.ts`
- Test: `tests/validate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/validate.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/validate.test.ts`
Expected: FAIL — `Cannot find module '../src/validate'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/validate.ts`:

```typescript
import type { Config, Data, Skill } from "./types";

export interface ValidationError {
	message: string;
}

const REQUIRED_FIELDS: (keyof Skill)[] = ["id", "categoryId", "name", "invocation", "description", "summary"];

export function validateData(config: Config, data: Data): ValidationError[] {
	const errors: ValidationError[] = [];
	const categoryIds = new Set(config.categories.map((category) => category.id));
	const skillIds = new Set(data.skills.map((skill) => skill.id));

	for (const skill of data.skills) {
		for (const field of REQUIRED_FIELDS) {
			if (!skill[field]) {
				errors.push({ message: `Skill "${skill.id || "<unknown>"}" is missing required field "${field}"` });
			}
		}
		if (skill.categoryId && !categoryIds.has(skill.categoryId)) {
			errors.push({ message: `Skill "${skill.id}" has unknown categoryId "${skill.categoryId}"` });
		}
		for (const dependencyId of skill.dependsOn ?? []) {
			if (!skillIds.has(dependencyId)) {
				errors.push({ message: `Skill "${skill.id}" depends on unknown skill "${dependencyId}"` });
			}
		}
	}

	return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/validate.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts tests/validate.test.ts
git commit -m "feat: add data validation (unknown category, dangling dependsOn, missing fields)"
```

---

### Task 4: Dependency derivation logic

**Files:**
- Create: `src/derive.ts`
- Test: `tests/derive.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/derive.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/derive.test.ts`
Expected: FAIL — `Cannot find module '../src/derive'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/derive.ts`:

```typescript
import type { Skill } from "./types";

export function deriveUsedBy(skills: Skill[]): Map<string, string[]> {
	const usedBy = new Map<string, string[]>();
	for (const skill of skills) {
		for (const dependencyId of skill.dependsOn ?? []) {
			const existing = usedBy.get(dependencyId) ?? [];
			existing.push(skill.id);
			usedBy.set(dependencyId, existing);
		}
	}
	return usedBy;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/derive.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/derive.ts tests/derive.test.ts
git commit -m "feat: derive used-by relationships from dependsOn instead of hand-maintaining both"
```

---

### Task 5: Search/filter logic

**Files:**
- Create: `src/search.ts`
- Test: `tests/search.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/search.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/search.test.ts`
Expected: FAIL — `Cannot find module '../src/search'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/search.ts`:

```typescript
import type { Skill } from "./types";

export function buildSearchText(skill: Skill): string {
	return [skill.name, skill.description, skill.summary, (skill.tags ?? []).join(" "), skill.note ?? ""]
		.join(" ")
		.toLowerCase();
}

export function filterSkills(skills: Skill[], query: string): Skill[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return skills;
	return skills.filter((skill) => buildSearchText(skill).includes(normalized));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/search.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/search.ts tests/search.test.ts
git commit -m "feat: add search/filter logic over name, description, summary, tags"
```

---

### Task 6: Theme persistence logic

**Files:**
- Create: `src/theme.ts`
- Test: `tests/theme.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/theme.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { getPreferredTheme, readStoredTheme, writeStoredTheme } from "../src/theme";

function makeMemoryStorage(): Storage {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		clear: () => store.clear(),
		key: () => null,
		length: 0
	} as Storage;
}

describe("getPreferredTheme", () => {
	it("returns dark when the OS prefers dark", () => {
		expect(getPreferredTheme(true)).toBe("dark");
	});

	it("returns light when the OS prefers light", () => {
		expect(getPreferredTheme(false)).toBe("light");
	});
});

describe("stored theme round-trip", () => {
	it("returns null when nothing is stored", () => {
		expect(readStoredTheme(makeMemoryStorage())).toBeNull();
	});

	it("round-trips a written theme", () => {
		const storage = makeMemoryStorage();
		writeStoredTheme(storage, "dark");
		expect(readStoredTheme(storage)).toBe("dark");
	});

	it("returns null instead of throwing when storage access throws", () => {
		const throwingStorage = {
			getItem: () => {
				throw new Error("blocked");
			}
		} as unknown as Storage;
		expect(readStoredTheme(throwingStorage)).toBeNull();
	});

	it("does not throw when writing to storage that throws", () => {
		const throwingStorage = {
			setItem: () => {
				throw new Error("blocked");
			}
		} as unknown as Storage;
		expect(() => writeStoredTheme(throwingStorage, "dark")).not.toThrow();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/theme.test.ts`
Expected: FAIL — `Cannot find module '../src/theme'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/theme.ts`:

```typescript
export type Theme = "light" | "dark";

const STORAGE_KEY = "skills-reference-theme";

export function getPreferredTheme(prefersDark: boolean): Theme {
	return prefersDark ? "dark" : "light";
}

export function readStoredTheme(storage: Storage | undefined): Theme | null {
	try {
		const value = storage?.getItem(STORAGE_KEY);
		return value === "light" || value === "dark" ? value : null;
	} catch {
		return null;
	}
}

export function writeStoredTheme(storage: Storage | undefined, theme: Theme): void {
	try {
		storage?.setItem(STORAGE_KEY, theme);
	} catch {
		// localStorage can be unavailable or inconsistent on file:// origins; ignore.
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/theme.test.ts`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/theme.ts tests/theme.test.ts
git commit -m "feat: add theme preference resolution with storage-failure fallback"
```

---

### Task 7: Render helper functions

**Files:**
- Create: `src/render.ts`
- Test: `tests/render.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/render.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/render.test.ts`
Expected: FAIL — `Cannot find module '../src/render'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/render.ts`:

```typescript
import type { Category, Skill } from "./types";

export function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderTagChips(tags: string[] | undefined): string {
	return (tags ?? []).map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("");
}

function renderChipList(ids: string[], skillsById: Map<string, Skill>): string {
	return ids
		.map((id) => {
			const target = skillsById.get(id);
			const label = target ? target.name : id;
			return `<button class="skill-ref-chip" data-skill-ref="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
		})
		.join("");
}

export function renderCrossReferences(
	skill: Skill,
	usedBy: Map<string, string[]>,
	skillsById: Map<string, Skill>
): string {
	const dependsOn = skill.dependsOn ?? [];
	const usedByIds = usedBy.get(skill.id) ?? [];
	if (dependsOn.length === 0 && usedByIds.length === 0) return "";

	const dependsOnBlock =
		dependsOn.length > 0
			? `<div class="cross-ref"><span class="cross-ref-label">Depends on</span>${renderChipList(dependsOn, skillsById)}</div>`
			: "";
	const usedByBlock =
		usedByIds.length > 0
			? `<div class="cross-ref"><span class="cross-ref-label">Used by</span>${renderChipList(usedByIds, skillsById)}</div>`
			: "";

	return `<div class="cross-refs">${dependsOnBlock}${usedByBlock}</div>`;
}

export function renderCategoryHeader(category: Category, skillCount: number): string {
	return `
		<div class="category-head">
			<span class="tag" style="background:${category.color}">${escapeHtml(category.name)}</span>
			<h2>${escapeHtml(category.name)}</h2>
			<span class="count">${skillCount} skill${skillCount === 1 ? "" : "s"}</span>
		</div>
		<p class="category-desc">${escapeHtml(category.description)}</p>
	`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/render.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/render.ts tests/render.test.ts
git commit -m "feat: add HTML render helpers for tag chips, cross-references, category headers"
```

---

### Task 8: Styles and template shell

**Files:**
- Create: `src/styles.css`
- Create: `src/template.html`

- [ ] **Step 1: Create `src/styles.css`**

```css
:root {
	--bg: #fafafa;
	--panel: #ffffff;
	--border: #d8d8d8;
	--text: #1b1b1b;
	--text-muted: #5c5c5c;
	--mono-bg: #f6f6f6;
}

:root[data-theme="dark"] {
	--bg: #14161a;
	--panel: #1c1f24;
	--border: #33383f;
	--text: #e8e8e8;
	--text-muted: #a0a5ab;
	--mono-bg: #22262b;
}

* {
	box-sizing: border-box;
}

body {
	margin: 0;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
	background: var(--bg);
	color: var(--text);
}

header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #1b1b1b;
	color: #fff;
	padding: 28px 40px;
}

header h1 {
	margin: 0;
	font-size: 24px;
	font-weight: 600;
}

.header-actions button {
	background: transparent;
	border: 1px solid #444;
	color: #fff;
	border-radius: 6px;
	padding: 6px 10px;
	cursor: pointer;
	font-size: 16px;
}

.toolbar {
	position: sticky;
	top: 0;
	z-index: 10;
	background: var(--panel);
	border-bottom: 1px solid var(--border);
	padding: 14px 40px;
	display: flex;
	align-items: center;
	gap: 16px;
	flex-wrap: wrap;
}

.toolbar input[type="search"] {
	flex: 1;
	min-width: 220px;
	padding: 9px 14px;
	border: 1px solid var(--border);
	border-radius: 6px;
	font-size: 14px;
	background: var(--panel);
	color: var(--text);
}

.toolbar button {
	padding: 9px 14px;
	border: 1px solid var(--border);
	background: var(--panel);
	border-radius: 6px;
	font-size: 13px;
	cursor: pointer;
	color: var(--text);
}

.toolbar button:hover {
	background: var(--mono-bg);
}

.summary-counts {
	display: flex;
	gap: 10px;
	font-size: 12px;
	color: var(--text-muted);
}

.summary-counts span {
	padding: 3px 9px;
	border-radius: 12px;
	background: var(--mono-bg);
	border: 1px solid var(--border);
	white-space: nowrap;
}

main {
	max-width: 960px;
	margin: 0 auto;
	padding: 28px 40px 80px;
}

.category {
	margin-bottom: 34px;
}

.category.hidden {
	display: none;
}

.category-head {
	display: flex;
	align-items: baseline;
	gap: 10px;
	border-bottom: 2px solid var(--border);
	padding-bottom: 8px;
	margin-bottom: 14px;
}

.category-head h2 {
	margin: 0;
	font-size: 19px;
}

.category-head .count {
	font-size: 13px;
	color: var(--text-muted);
}

.category-desc {
	margin: 0 0 14px 0;
	font-size: 13px;
	color: var(--text-muted);
}

.skill {
	border: 1px solid var(--border);
	border-radius: 6px;
	margin-bottom: 8px;
	background: var(--panel);
	overflow: hidden;
}

.skill.hidden {
	display: none;
}

.skill-row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	cursor: pointer;
	user-select: none;
}

.skill-row:hover {
	background: var(--mono-bg);
}

.tag {
	flex: 0 0 auto;
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.03em;
	color: #fff;
	padding: 4px 9px;
	border-radius: 4px;
	text-transform: uppercase;
}

.skill-name {
	font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
	font-weight: 600;
	font-size: 14px;
	flex: 0 0 auto;
}

.topic-tags {
	flex: 1 1 auto;
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	min-width: 0;
}

.tag-chip {
	font-size: 11px;
	color: var(--text-muted);
	background: var(--mono-bg);
	border: 1px solid var(--border);
	padding: 2px 8px;
	border-radius: 10px;
	white-space: nowrap;
}

.badge {
	flex: 0 0 auto;
	font-size: 10px;
	font-weight: 600;
	padding: 3px 8px;
	border-radius: 10px;
	white-space: nowrap;
}

.badge.auto {
	background: #e8f8f0;
	color: #0f7a4d;
}

.badge.manual {
	background: #fff6e5;
	color: #8a5a00;
	border: 1px solid #f5c26b;
}

.badge.interactive {
	background: #f2ecff;
	color: #6b3fd4;
	border: 1px solid #d9c9ff;
}

.badge.autonomous {
	background: #eef7ee;
	color: #2f7a3c;
	border: 1px solid #cfe8cf;
}

.chevron {
	flex: 0 0 auto;
	font-size: 12px;
	color: var(--text-muted);
	transition: transform 0.15s ease;
}

.skill.open .chevron {
	transform: rotate(90deg);
}

.skill-body {
	display: none;
	padding: 4px 16px 18px 16px;
	border-top: 1px solid var(--border);
}

.skill.open .skill-body {
	display: block;
}

.skill-summary-line {
	font-size: 14.5px;
	line-height: 1.5;
	margin: 14px 0 10px 0;
}

.cross-refs {
	margin-top: 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cross-ref {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.cross-ref-label {
	font-size: 11px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--text-muted);
}

.skill-ref-chip {
	font-size: 12px;
	padding: 3px 10px;
	border-radius: 12px;
	border: 1px solid var(--border);
	background: var(--mono-bg);
	color: var(--text);
	cursor: pointer;
}

.skill-ref-chip:hover {
	background: var(--border);
}

footer {
	text-align: center;
	font-size: 12px;
	color: var(--text-muted);
	padding: 20px;
}
```

- [ ] **Step 2: Create `src/template.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Skills Reference</title>
<style>__STYLES__</style>
</head>
<body>
<header>
	<h1>Skills Reference</h1>
	<div class="header-actions">
		<button id="themeToggle" aria-label="Toggle light/dark theme" title="Toggle light/dark theme">&#127765;</button>
	</div>
</header>

<div class="toolbar">
	<input type="search" id="searchBox" placeholder="Filter skills by name, description, or tag…" />
	<button id="expandAll">Expand all</button>
	<button id="collapseAll">Collapse all</button>
	<div class="summary-counts" id="summaryCounts"></div>
</div>

<main id="app"></main>

<footer>Generated by skills-reference · see README.md for how to point this at your own skills</footer>

<script type="application/json" id="config-data">__CONFIG_JSON__</script>
<script type="application/json" id="skills-data">__DATA_JSON__</script>
<script>__APP_JS__</script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add src/styles.css src/template.html
git commit -m "feat: add themeable stylesheet and HTML shell template"
```

---

### Task 9: Main entry point wiring

**Files:**
- Create: `src/main.ts`
- Test: `tests/main.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/main.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { boot } from "../src/main";
import type { Config, Data } from "../src/types";

const config: Config = {
	categories: [{ id: "personal", name: "Personal", color: "#61affe", description: "desc", scanPaths: [] }]
};

const data: Data = {
	skills: [
		{
			id: "a",
			categoryId: "personal",
			name: "Skill A",
			invocation: "auto",
			description: "does a",
			summary: "does a",
			tags: ["git"],
			dependsOn: ["b"]
		},
		{
			id: "b",
			categoryId: "personal",
			name: "Skill B",
			invocation: "manual",
			description: "does b",
			summary: "does b"
		}
	]
};

function setupDom(): void {
	document.body.innerHTML = `
		<button id="themeToggle"></button>
		<input type="search" id="searchBox" />
		<button id="expandAll"></button>
		<button id="collapseAll"></button>
		<div class="summary-counts" id="summaryCounts"></div>
		<main id="app"></main>
		<script type="application/json" id="config-data">${JSON.stringify(config)}</script>
		<script type="application/json" id="skills-data">${JSON.stringify(data)}</script>
	`;
}

describe("boot", () => {
	beforeEach(() => {
		window.localStorage.clear();
		setupDom();
	});

	it("renders one .skill element per skill", () => {
		boot(document, window);
		expect(document.querySelectorAll(".skill")).toHaveLength(2);
	});

	it("renders the cross-reference relationship between skills", () => {
		boot(document, window);
		const skillA = document.querySelector('.skill[data-skill-id="a"]');
		expect(skillA?.textContent).toContain("Depends on");
		const skillB = document.querySelector('.skill[data-skill-id="b"]');
		expect(skillB?.textContent).toContain("Used by");
	});

	it("hides non-matching skills when searching", () => {
		boot(document, window);
		const searchBox = document.getElementById("searchBox") as HTMLInputElement;
		searchBox.value = "does a";
		searchBox.dispatchEvent(new Event("input"));
		const skillA = document.querySelector('.skill[data-skill-id="a"]');
		const skillB = document.querySelector('.skill[data-skill-id="b"]');
		expect(skillA?.classList.contains("hidden")).toBe(false);
		expect(skillB?.classList.contains("hidden")).toBe(true);
	});

	it("toggles theme on click and persists it", () => {
		boot(document, window);
		const toggle = document.getElementById("themeToggle") as HTMLButtonElement;
		const initialTheme = document.documentElement.dataset.theme;
		toggle.click();
		expect(document.documentElement.dataset.theme).not.toBe(initialTheme);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/main.test.ts`
Expected: FAIL — `Cannot find module '../src/main'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/main.ts`:

```typescript
import type { Category, Config, Data, Skill } from "./types";
import { deriveUsedBy } from "./derive";
import { filterSkills } from "./search";
import { escapeHtml, renderCategoryHeader, renderCrossReferences, renderTagChips } from "./render";
import { getPreferredTheme, readStoredTheme, writeStoredTheme, type Theme } from "./theme";

function readEmbeddedJson<T>(doc: Document, elementId: string): T {
	const element = doc.getElementById(elementId);
	if (!element || !element.textContent) {
		throw new Error(`Missing embedded data for #${elementId}`);
	}
	return JSON.parse(element.textContent) as T;
}

function renderSkillCard(
	skill: Skill,
	category: Category,
	usedBy: Map<string, string[]>,
	skillsById: Map<string, Skill>
): string {
	const modeBadge = skill.interactive
		? `<span class="badge interactive">Interactive</span>`
		: `<span class="badge autonomous">Autonomous</span>`;
	const invocationBadge = `<span class="badge ${skill.invocation === "manual" ? "manual" : "auto"}">${
		skill.invocation === "manual" ? "Manual invocation" : "Auto-discoverable"
	}</span>`;
	const searchText = [skill.name, skill.description, skill.summary, (skill.tags ?? []).join(" ")]
		.join(" ")
		.toLowerCase();

	return `
		<div class="skill" data-search-text="${escapeHtml(searchText)}" data-skill-id="${escapeHtml(skill.id)}">
			<div class="skill-row">
				<span class="tag" style="background:${category.color}">${escapeHtml(category.name)}</span>
				<span class="skill-name">${escapeHtml(skill.name)}</span>
				<span class="topic-tags">${renderTagChips(skill.tags)}${modeBadge}</span>
				${invocationBadge}
				<span class="chevron">&#9656;</span>
			</div>
			<div class="skill-body">
				<p class="skill-summary-line"><strong>${escapeHtml(skill.summary)}</strong></p>
				${renderCrossReferences(skill, usedBy, skillsById)}
			</div>
		</div>
	`;
}

export function renderSkillsIntoContainer(
	container: HTMLElement,
	categories: Category[],
	skills: Skill[],
	usedBy: Map<string, string[]>,
	skillsById: Map<string, Skill>
): void {
	container.innerHTML = categories
		.map((category) => {
			const categorySkills = skills.filter((skill) => skill.categoryId === category.id);
			if (categorySkills.length === 0) return "";
			const cards = categorySkills.map((skill) => renderSkillCard(skill, category, usedBy, skillsById)).join("");
			return `<section class="category" data-cat-id="${escapeHtml(category.id)}">${renderCategoryHeader(
				category,
				categorySkills.length
			)}${cards}</section>`;
		})
		.join("");
}

export function wireInteractions(doc: Document, skills: Skill[]): void {
	doc.querySelectorAll<HTMLElement>(".skill-row").forEach((row) => {
		row.addEventListener("click", () => {
			row.parentElement?.classList.toggle("open");
		});
	});

	doc.querySelectorAll<HTMLButtonElement>(".skill-ref-chip").forEach((chip) => {
		chip.addEventListener("click", (event) => {
			event.stopPropagation();
			const targetId = chip.dataset.skillRef;
			const target = doc.querySelector<HTMLElement>(`.skill[data-skill-id="${targetId}"]`);
			target?.classList.add("open");
			target?.scrollIntoView({ block: "center" });
		});
	});

	doc.getElementById("expandAll")?.addEventListener("click", () => {
		doc.querySelectorAll(".skill").forEach((el) => el.classList.add("open"));
	});
	doc.getElementById("collapseAll")?.addEventListener("click", () => {
		doc.querySelectorAll(".skill").forEach((el) => el.classList.remove("open"));
	});

	const searchBox = doc.getElementById("searchBox") as HTMLInputElement | null;
	searchBox?.addEventListener("input", () => {
		const matches = new Set(filterSkills(skills, searchBox.value).map((skill) => skill.id));
		doc.querySelectorAll<HTMLElement>(".skill").forEach((el) => {
			const skillId = el.dataset.skillId ?? "";
			el.classList.toggle("hidden", searchBox.value.trim().length > 0 && !matches.has(skillId));
		});
		doc.querySelectorAll<HTMLElement>(".category").forEach((categoryEl) => {
			const anyVisible = Array.from(categoryEl.querySelectorAll(".skill")).some(
				(el) => !el.classList.contains("hidden")
			);
			categoryEl.classList.toggle("hidden", !anyVisible);
		});
	});
}

function applyTheme(doc: Document, theme: Theme): void {
	doc.documentElement.dataset.theme = theme;
}

export function wireTheme(doc: Document, win: Window): void {
	const stored = readStoredTheme(win.localStorage);
	const prefersDark = win.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
	let current: Theme = stored ?? getPreferredTheme(prefersDark);
	applyTheme(doc, current);

	doc.getElementById("themeToggle")?.addEventListener("click", () => {
		current = current === "dark" ? "light" : "dark";
		applyTheme(doc, current);
		writeStoredTheme(win.localStorage, current);
	});
}

export function boot(doc: Document, win: Window): void {
	const config = readEmbeddedJson<Config>(doc, "config-data");
	const data = readEmbeddedJson<Data>(doc, "skills-data");
	const usedBy = deriveUsedBy(data.skills);
	const skillsById = new Map(data.skills.map((skill) => [skill.id, skill]));

	const app = doc.getElementById("app");
	if (!app) throw new Error("Missing #app container");
	renderSkillsIntoContainer(app, config.categories, data.skills, usedBy, skillsById);
	wireInteractions(doc, data.skills);
	wireTheme(doc, win);

	const summaryCounts = doc.getElementById("summaryCounts");
	if (summaryCounts) {
		const counts = config.categories
			.map(
				(category) =>
					`<span>${escapeHtml(category.name)}: ${
						data.skills.filter((skill) => skill.categoryId === category.id).length
					}</span>`
			)
			.join("");
		summaryCounts.innerHTML = `<span>Total: ${data.skills.length}</span>${counts}`;
	}
}

if (typeof document !== "undefined" && document.getElementById("app")) {
	boot(document, window);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/main.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Run the full test suite so far**

Run: `npm run test`
Expected: PASS — all test files green.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts tests/main.test.ts
git commit -m "feat: wire rendering, search, expand/collapse, and theme toggle into the app shell"
```

---

### Task 10: Build script

**Files:**
- Create: `scripts/build.ts`
- Test: `tests/build.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/build.test.ts`:

```typescript
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/build.test.ts`
Expected: FAIL — `Cannot find module '../scripts/build'`.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/build.ts`:

```typescript
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

	const html = template
		.replace("__STYLES__", styles)
		.replace("__CONFIG_JSON__", escapeForInlineScript(JSON.stringify(config)))
		.replace("__DATA_JSON__", escapeForInlineScript(JSON.stringify(data)))
		.replace("__APP_JS__", escapeForInlineScript(outputFile.text));

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/build.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS — every test file green.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: exits 0 with no errors.

- [ ] **Step 7: Commit**

```bash
git add scripts/build.ts tests/build.test.ts
git commit -m "feat: add build script that validates and inlines config/data into dist/index.html"
```

---

### Task 11: Dev server

**Files:**
- Create: `scripts/dev-server.ts`

- [ ] **Step 1: Create `scripts/dev-server.ts`**

```typescript
import { createServer } from "node:http";
import { readFileSync, watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runBuild } from "./build";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = resolve(ROOT, "config.json");
const DATA_PATH = resolve(ROOT, "data.json");
const OUT_PATH = resolve(ROOT, "dist/index.html");
const PORT = 4173;

async function rebuild(): Promise<void> {
	try {
		await runBuild(CONFIG_PATH, DATA_PATH, OUT_PATH);
		console.log("Rebuilt dist/index.html");
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
	}
}

await rebuild();

watch(resolve(ROOT, "src"), { recursive: true }, () => {
	void rebuild();
});
watch(CONFIG_PATH, () => {
	void rebuild();
});
watch(DATA_PATH, () => {
	void rebuild();
});

createServer((_request, response) => {
	const html = readFileSync(OUT_PATH, "utf-8");
	response.writeHead(200, { "Content-Type": "text/html" });
	response.end(html);
}).listen(PORT, () => {
	console.log(`Serving dist/index.html at http://localhost:${PORT} (rebuilds on save)`);
});
```

- [ ] **Step 2: Manually verify the dev server starts**

Run: `npm run dev` (in a background terminal, since this process stays running)
Expected: prints `Rebuilt dist/index.html` followed by `Serving dist/index.html at http://localhost:4173 (rebuilds on save)`. Stop it with Ctrl+C once confirmed.

- [ ] **Step 3: Commit**

```bash
git add scripts/dev-server.ts
git commit -m "feat: add dev server that rebuilds on save and serves dist/index.html"
```

---

### Task 12: Example/template data

**Files:**
- Create: `config.json`
- Create: `data.json`

- [ ] **Step 1: Create `config.json`**

```json
{
	"categories": [
		{
			"id": "personal",
			"name": "Personal",
			"color": "#61affe",
			"description": "Skills available in every project, invoked on demand for personal productivity workflows.",
			"scanPaths": ["~/.cursor/skills/**/SKILL.md"]
		},
		{
			"id": "project",
			"name": "Project",
			"color": "#49cc90",
			"description": "Skills committed to a specific project's repo, shared with anyone working in it.",
			"scanPaths": ["./.cursor/skills/**/SKILL.md"]
		}
	]
}
```

- [ ] **Step 2: Create `data.json`**

```json
{
	"skills": [
		{
			"id": "example-scanner",
			"categoryId": "personal",
			"name": "example-scanner",
			"invocation": "auto",
			"description": "Example skill: scans a folder and summarizes what it finds. Replace this with your own skills — see README.md.",
			"summary": "Scans a folder and summarizes what it finds.",
			"tags": ["example", "filesystem"],
			"interactive": false,
			"updated": "2026-07-11"
		},
		{
			"id": "example-reporter",
			"categoryId": "personal",
			"name": "example-reporter",
			"invocation": "manual",
			"description": "Example skill: formats example-scanner's output into a report. Depends on example-scanner having run first.",
			"summary": "Formats scan output into a shareable report.",
			"tags": ["example", "reporting"],
			"interactive": true,
			"dependsOn": ["example-scanner"],
			"updated": "2026-07-11"
		},
		{
			"id": "example-project-linter",
			"categoryId": "project",
			"name": "example-project-linter",
			"invocation": "auto",
			"description": "Example skill: a project-specific linting workflow, showing what a Project-category entry looks like.",
			"summary": "Runs a project-specific lint workflow.",
			"tags": ["example", "linting"],
			"interactive": false,
			"updated": "2026-07-11"
		}
	]
}
```

- [ ] **Step 3: Build and verify the example data renders**

Run: `npm run build`
Expected: prints `Built dist/index.html`; `dist/index.html` exists and contains `example-scanner`, `example-reporter`, and `example-project-linter`.

- [ ] **Step 4: Commit**

```bash
git add config.json data.json
git commit -m "feat: add example config/data demonstrating categories and dependsOn"
```

---

### Task 13: Documentation

**Files:**
- Create: `SCHEMA.md`
- Create: `README.md`

- [ ] **Step 1: Create `SCHEMA.md`**

```markdown
# Data Schema

## `config.json`

```json
{
	"categories": [
		{
			"id": "string, unique, used as a foreign key from data.json's categoryId",
			"name": "string, display name",
			"color": "string, any valid CSS color",
			"description": "string, shown under the category heading",
			"scanPaths": ["array of glob-like path patterns — metadata for whatever agent scans your skills; the app itself never reads the filesystem"]
		}
	]
}
```

## `data.json`

```json
{
	"skills": [
		{
			"id": "string, unique (required)",
			"categoryId": "string, must match a category id in config.json (required)",
			"name": "string (required)",
			"invocation": "\"auto\" | \"manual\" (required)",
			"description": "string, full description (required)",
			"summary": "string, one-line summary shown collapsed (required)",
			"location": "string, optional — filesystem path to the skill's source file",
			"note": "string, optional — freeform note (e.g. pending PR context)",
			"status": "string, optional — freeform status badge text",
			"descriptionIntro": "string, optional — intro line shown before descriptionBullets",
			"descriptionBullets": ["array of strings, optional"],
			"howToUse": ["array of strings, optional — numbered usage steps"],
			"tags": ["array of strings, optional"],
			"interactive": "boolean, optional",
			"shared": "boolean, optional",
			"updated": "string, optional — ISO date",
			"dependsOn": ["array of skill ids, optional — hand-curated; the reverse \"used by\" relationship is derived automatically, don't maintain it by hand"]
		}
	]
}
```

## Validation rules (enforced at build time by `scripts/build.ts`)

- Every skill's `categoryId` must match a category `id` in `config.json`.
- Every id listed in a skill's `dependsOn` must match another skill's `id` in `data.json`.
- `id`, `categoryId`, `name`, `invocation`, `description`, and `summary` are required on every skill.

A build with any of these problems fails with a specific error message naming the offending skill — it never silently ships broken data.
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Skills Reference

A portable, config-driven catalog viewer for Agent Skills (or any similarly-shaped catalog of tools). Renders a static, dependency-free `dist/index.html` you can open directly in a browser, serve locally, or deploy anywhere — no server required to use it.

## Quick start

```bash
npm install
npm run build
open dist/index.html
```

## Pointing this at your own skills

1. Clone this repo.
2. Edit `config.json` to describe your own categories and where your skills live (the `scanPaths` field — see `SCHEMA.md`).
3. Hand this repo, plus access to your environment, to an agent. Ask it to read `SCHEMA.md`, scan the paths listed in your `config.json`, and write `data.json` to match your actual skills.
4. Run `npm run build` to produce your own `dist/index.html`.

## Development

- `npm run dev` — starts a local server at `http://localhost:4173` that rebuilds `dist/index.html` whenever you edit `src/`, `config.json`, or `data.json`.
- `npm run build` — validates `config.json`/`data.json` and produces the portable `dist/index.html`.
- `npm run test` — runs the test suite.
- `npm run typecheck` — runs the TypeScript compiler in check-only mode.

See `SCHEMA.md` for the full `config.json`/`data.json` field reference.
```

- [ ] **Step 3: Commit**

```bash
git add SCHEMA.md README.md
git commit -m "docs: add schema reference and onboarding README"
```

---

### Task 14: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS — every test file green, no failures.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: exits 0 with no errors.

- [ ] **Step 3: Run a clean build**

Run: `rm -rf dist && npm run build`
Expected: prints `Built dist/index.html`; the file exists.

- [ ] **Step 4: Open the built file directly and manually verify in a browser**

Open `dist/index.html` directly (e.g. via `open dist/index.html` on macOS, or drag it into a browser tab). Confirm:
- All three example skills render, grouped under "Personal" and "Project" category headings.
- Typing in the search box hides non-matching skills.
- Expand all / Collapse all both work.
- Clicking `example-reporter` shows a "Depends on" chip for `example-scanner`; clicking that chip jumps to and expands `example-scanner`, which itself shows a "Used by" chip back to `example-reporter`.
- The theme toggle switches between light and dark, and the choice persists across a page reload.
- No errors appear in the browser's developer console.

- [ ] **Step 5: Final commit if anything was adjusted during manual verification**

```bash
git status
```

If manual verification required any fixes, commit them with a message describing what was fixed. If everything passed as-is, no commit is needed for this step.
