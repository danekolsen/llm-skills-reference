<img width="1314" height="979" alt="Screenshot 2026-07-10 at 9 39 21 PM" src="https://github.com/user-attachments/assets/035e307f-bd37-4480-a5b1-362d69bba87b" />


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
