<img width="1291" height="983" alt="Screenshot 2026-07-10 at 11 04 13 PM" src="https://github.com/user-attachments/assets/d20038b3-ffa2-4ce1-8239-d88bf036534b" />


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
3. Hand this repo, plus access to your environment, to an agent, and ask it to run the `update-skills-doc` skill (`skills/update-skills-doc/SKILL.md`, shipped in this repo — see "Keeping the catalog in sync" below). On a fresh `data.json` this treats every skill on disk as an ADD: it reads each `SKILL.md` in full, not just its frontmatter, so entries come in with `location`, `tags`, and — where the skill's own docs support it — `descriptionIntro`/`descriptionBullets`/`howToUse` already filled in, instead of a bare name/description.
4. Run `npm run build` to produce your own `dist/index.html`.

## Keeping the catalog in sync

This repo ships its own `update-skills-doc` skill at
`skills/update-skills-doc/SKILL.md` — a real, non-fictional example in
`data.json` (see the `project` category) as well as a working tool. Point an
agent at it (or just ask it to "update the skill catalog") and it will scan
the locations declared in your `config.json`, diff them against `data.json`,
and walk you through a single grouped review before editing anything. See the
skill file for details.

## Development

- `npm run dev` — starts a local server at `http://localhost:4173` that rebuilds `dist/index.html` whenever you edit `src/`, `config.json`, or `data.json`.
- `npm run build` — validates `config.json`/`data.json` and produces the portable `dist/index.html`.
- `npm run test` — runs the test suite.
- `npm run typecheck` — runs the TypeScript compiler in check-only mode.

See `SCHEMA.md` for the full `config.json`/`data.json` field reference.
