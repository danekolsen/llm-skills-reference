# Doc Data Model & Scan Map

Everything needed to edit this project's `config.json`/`data.json` catalog
safely, beyond what's already in the project's root `SCHEMA.md` (read that
first for the exact field-by-field schema — it isn't repeated here).

## Table of contents
- [Where the scan map lives](#where-the-scan-map-lives)
- [Canonical name & frontmatter](#canonical-name--frontmatter)
- [Shared / symlinked skills](#shared--symlinked-skills)
- [Grouped review template](#grouped-review-template)

## Where the scan map lives

Unlike the legacy single-file HTML catalog this skill was ported from, there
is no hardcoded folder→category table to keep in sync here. `config.json`'s
`categories[].scanPaths` field **is** the scan map — each category names its
own glob-like locations, and step 2 of the workflow just walks whatever is
declared there. Point `config.json` at your real skill folders once (e.g.
`~/.cursor/skills/**/SKILL.md`, `<repo>/.cursor/skills/**/SKILL.md`,
`<repo>/.claude/skills/**/SKILL.md`); this skill picks up changes to that list
automatically on the next run — no skill-file edit required.

A folder counts as a skill only if it holds a `SKILL.md`.

## Canonical name & frontmatter

- **Name:** the skill's folder name, with a `-compiled` suffix stripped —
  Cursor compiles a personal skill into a `<name>-compiled` sibling, and the
  canonical entry is the un-suffixed name (`onboard-feature-compiled` →
  `onboard-feature`). Match catalog entries to disk on the canonical name.
- **invocation:** read `SKILL.md` frontmatter — `disable-model-invocation:
  true` → `"manual"`, otherwise `"auto"`.
- **description:** the frontmatter `description`, verbatim, is the source of
  truth for description-drift comparisons. `summary` (the one-line collapsed
  view) has no frontmatter equivalent — hand-write it when adding a skill and
  leave it alone afterward unless the user asks you to revise it.

## Shared / symlinked skills

A skill reachable from two scan locations via a symlink (e.g. a licenser skill
shared between two repos) is one skill with two catalog entries carrying
`shared: true` and a `note` explaining the symlink. Treat both entries as
accurate as long as the symlink resolves; don't report the mirror as a
duplicate or as catalog-only.

Skill-builders installed via a package manager into one location and then
*bridged* (copied) into another so the host agent discovers them are the same
situation: pick one category as the skill's home and don't also list the
bridged copy under a second category unless the user's `config.json` says
otherwise.

## Grouped review template

```
## Skills catalog reconciliation — <N> discrepancies
(mode: standalone | registration; auto-added: <skill or none>)

### Add (on disk, missing from catalog)
- <category> / <name> — <one-line why> → proposed entry: {…}

### In catalog but not on disk (will NOT auto-remove)
- <category> / <name> — <branch/PR status signal> → recommend: keep note / update / remove

### Status / badge drift
- <category> / <name> — catalog: "<old>" → proposed: "<new>" (reason)

### Description drift
- <category> / <name> — catalog vs SKILL.md diff → proposed description

Nothing is applied except the auto-added skill until you approve per item.
```
