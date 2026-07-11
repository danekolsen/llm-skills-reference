<img width="1304" height="988" alt="Screenshot 2026-07-10 at 10 26 10 PM" src="https://github.com/user-attachments/assets/b330f79d-6b82-49a7-a789-9bfb3c8122e2" />


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

## Keeping the catalog in sync

This repo ships its own `update-skills-doc` skill at
`.cursor/skills/update-skills-doc/SKILL.md` — a real, non-fictional example in
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
