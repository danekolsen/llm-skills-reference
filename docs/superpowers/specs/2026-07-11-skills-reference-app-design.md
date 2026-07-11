# Skills Reference App — Design

## Context

`~/.cursor/skills/skills-reference.html` started as a personal Swagger-style catalog of Cursor Agent Skills: a single self-contained HTML file with an inline `CATEGORIES` JS array (~35 skills across 7 categories) and vanilla-JS render/search logic, maintained by hand-editing that array (most recently via the `update-skills-doc` skill's surgical text patches).

It's outgrown that shape. New feature ideas (light/dark theming, a dependency graph between skills, making the tool usable by other people in their own setups) don't fit cleanly into "one 1,500-line HTML file with embedded JS literals." This spec covers building a small standalone, portable template app that replaces it.

## Goals

- Move skill data out of embedded JS into a declarative JSON file that's easy to hand-edit or have an agent edit.
- Make categories (and where to find skills for each) config-driven instead of hardcoded, so someone else can point this at their own environment.
- Add light/dark theming (OS-default + manual override) and a "depends on / used by" cross-reference view between skills.
- Keep the end product genuinely portable: open the built file directly in a browser with no server, or deploy it as a static site, without changing how it's built.
- Version the project in its own git repo, separate from work repos.

## Non-goals (deferred to a follow-up)

- Migrating the real ~35 skills from the current `skills-reference.html` into the new `data.json`.
- Rewriting/retiring the `update-skills-doc` skill to target the new repo instead of the old HTML file.
- A visual node/edge dependency graph — cross-references are simple textual links between skill entries, not a graph visualization library.
- Any kind of hosted/deployed instance — the design supports deployment, but standing one up isn't part of this project.
- In-browser editing UI, usage analytics, or scanning the filesystem from the app itself — the app is a pure viewer; filesystem scanning is an agent's job (see "How onboarding works" below), not the app's.

## Repo layout

New standalone repo at `~/Development/skills-reference`:

```
skills-reference/
├── config.json          # categories + scan-location patterns
├── data.json            # flat array of skill entries (source of truth)
├── src/
│   ├── main.ts           # render/search/filter/expand/theme logic
│   ├── styles.css        # theme tokens (CSS vars + prefers-color-scheme), layout
│   └── template.html     # shell markup (header/toolbar/main/footer) with build-time placeholders
├── scripts/
│   └── build.ts          # esbuild-based script: validates + inlines config.json/data.json, bundles src/*, writes dist/index.html
├── dist/
│   └── index.html        # the portable build artifact
├── package.json          # npm run dev (local server, live reload while editing), npm run build
├── tsconfig.json         # strict mode
├── SCHEMA.md             # documents config.json / data.json shapes for humans and agents
└── README.md             # setup + "point this at your own skills" instructions
```

## Data model

### `config.json`

```json
{
	"categories": [
		{
			"id": "personal",
			"name": "Personal",
			"color": "#61affe",
			"description": "Stored in ~/.cursor/skills/ — available in every project.",
			"scanPaths": ["~/.cursor/skills/**/SKILL.md"]
		}
	]
}
```

`scanPaths` is metadata for whatever onboards a new environment (see below) — the app itself never touches the filesystem; it only renders `config.json` + `data.json`.

### `data.json`

Flat array of skills, each referencing its category by id (rather than nesting skills inside categories, since the data-granularity choice was "single file" — a flat shape keeps that one file simple to scan and diff):

```json
{
	"skills": [
		{
			"id": "update-skills-doc",
			"categoryId": "personal",
			"name": "update-skills-doc",
			"invocation": "auto",
			"status": "PR #1919 (open, not yet merged)",
			"description": "Full trigger description...",
			"location": "~/.cursor/skills/update-skills-doc/SKILL.md",
			"note": "Optional freeform note, e.g. pending PR context.",
			"summary": "One-line summary shown collapsed.",
			"descriptionIntro": "Optional intro line before bullets.",
			"descriptionBullets": ["...", "..."],
			"howToUse": ["...", "..."],
			"tags": ["skill-authoring", "html", "data-sync"],
			"interactive": true,
			"shared": false,
			"updated": "2026-07-09",
			"dependsOn": ["skill-creator"]
		}
	]
}
```

Every field except `id`, `categoryId`, `name`, `invocation`, `description`, and `summary` is optional — this matches today's data, where plenty of skills have no `note`, `status`, or `shared` field.

`dependsOn` is the only new field, and it's hand-curated. `usedBy` is **derived at render time** by scanning every other skill's `dependsOn` for entries pointing back at you, rather than maintained by hand in both directions.

### Validation

`scripts/build.ts` validates `data.json` and `config.json` before inlining them: every skill's `categoryId` must match a known category, every `dependsOn` entry must match a known skill `id`, and required fields must be present. A malformed file fails the build with a clear error message rather than silently shipping a broken page.

## Build & runtime approach

Chosen over runtime-`fetch()` because `fetch()` of local JSON from a `file://` page is blocked by CORS in Chrome and others — that would break the "just open it in a browser" case for most people.

- `npm run build`: `scripts/build.ts` reads `config.json` + `data.json`, validates them, bundles `src/main.ts` + `src/styles.css` via esbuild, and inlines everything (bundled JS, CSS, and the two JSON files as embedded data) into a single `dist/index.html`. That file has zero runtime fetches, so it can be opened directly via `file://`, served locally, or deployed to any static host unchanged.
- `npm run dev`: a local dev server (esbuild's built-in serve mode or a thin wrapper) that rebuilds on save for fast iteration while editing `src/` or the JSON files. Not required for end users — only for anyone actively working on the app itself.

## UI features

Carried over from today's app: category sections with color tags, live search/filter across name/description/tags, expand-all/collapse-all, per-skill detail panel (summary, full description, "how to use" steps with "needs your input" tagging, metadata table), invocation (auto/manual) and interactive/autonomous badges, shared/status badges.

New:
- **Theme toggle** — CSS custom properties for light/dark tokens, defaulting to `prefers-color-scheme`, with a manual toggle button that overrides for the session (persisted via `localStorage` where available; falls back to session-only override if not, since `localStorage` behavior on `file://` origins can be inconsistent across browsers).
- **Dependency cross-references** — each skill's detail panel gains a "Depends on" / "Used by" block rendering clickable chips (computed as described above) that jump to and expand the referenced skill's entry.

## How onboarding works (for someone else's setup)

The app is a pure viewer over two JSON files — it has no filesystem access. Someone adopting this for their own skills:

1. Clones the repo.
2. Edits `config.json` to describe their own categories and where their skills live (`scanPaths`).
3. Hands the repo + their environment to an agent, which reads `SCHEMA.md` and `config.json`'s `scanPaths`, scans their actual skill files, and writes `data.json` to match.
4. Runs `npm run build` to produce their own `dist/index.html`.

This project only needs to make steps 2–4 possible (schema + config + build). Step 3 (an agent actually doing a scan-and-populate run) is exactly what a rewritten `update-skills-doc` would do against this repo — which is explicitly the deferred follow-up, not part of this project.

## Error handling

- Build-time: invalid JSON, missing required fields, unknown `categoryId`, or unresolvable `dependsOn` references fail the build with a specific error identifying the offending skill/category.
- Runtime: the shipped `dist/index.html` only ever renders already-validated data, so there's no runtime error handling needed beyond normal defensive rendering (e.g., a skill with no `tags` renders with no tag chips rather than throwing).

## Testing considerations

- A minimal fixture `config.json`/`data.json` (2-3 categories, handful of skills, at least one `dependsOn` relationship) to verify the build produces a working `dist/index.html` — opened and checked for no console errors, correct rendering, and working search/filter/theme-toggle/cross-reference behavior.
- A build-time validation test asserting bad fixtures (unknown `categoryId`, dangling `dependsOn`) fail the build with a useful error.
