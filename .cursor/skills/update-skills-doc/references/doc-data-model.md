# Doc Data Model & Scan Map

Everything needed to edit this project's `config.json`/`data.json` catalog
safely, beyond what's already in the project's root `SCHEMA.md` (read that
first for the exact field-by-field schema — it isn't repeated here).

## Table of contents
- [Where the scan map lives](#where-the-scan-map-lives)
- [Canonical name & frontmatter](#canonical-name--frontmatter)
- [Populating the deep fields for a new entry](#populating-the-deep-fields-for-a-new-entry)
- [Shared / symlinked skills](#shared--symlinked-skills)
- [Grouped review template](#grouped-review-template)

## Where the scan map lives

There is no hardcoded folder→category table to keep in sync here.
`config.json`'s `categories[].scanPaths` field **is** the scan map — each
category names its own glob-like locations, and step 2 of the workflow just
walks whatever is declared there. Point `config.json` at your real skill
folders once (e.g. `~/.cursor/skills/**/SKILL.md`,
`<repo>/.cursor/skills/**/SKILL.md`, `<repo>/.claude/skills/**/SKILL.md`);
this skill picks up changes to that list automatically on the next run — no
skill-file edit required.

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

## Populating the deep fields for a new entry

A bare ADD entry (`name`/`description`/`summary`/`invocation` only) is a
regression — a new skill should land with the same richness as a
hand-authored one. For every skill in the ADD bucket, read its full
`SKILL.md` — body included, not just frontmatter — and derive:

- **location:** the path to the skill's `SKILL.md` file (relative to the
  scanned root, or absolute — match whatever style existing entries use).
- **tags:** 2–6 short lowercase-kebab keywords capturing what the skill is
  about (domain, tool, or action). Nothing in the frontmatter supplies these
  — infer them from the name/description/body (a git-history-focused
  debugging skill might get `["git", "debugging", "regression"]`).
- **descriptionIntro** + **descriptionBullets:** if the body has a short
  "what this does" breakdown — an overview, a bulleted list of capabilities,
  a numbered set of guarantees — lift it into `descriptionIntro` (the
  lead-in sentence) and `descriptionBullets` (each bullet, lightly cleaned up
  — no markdown link/heading syntax carried over). If the body is prose
  without a natural bullet breakdown, leave both fields unset; the catalog
  viewer falls back to the plain `description` in that case, which is fine.
- **howToUse:** if the body has a workflow/steps/checklist section (numbered
  steps, a "## Workflow" checklist, etc.), turn each into one plain-language
  sentence per step, in order. Keep pause/approval language intact when a
  step genuinely waits for user input (e.g. "pauses and waits for your
  approval") — the catalog viewer auto-detects that language and tags the
  step accordingly, so don't hand-add a tag yourself. If the skill has no
  discrete steps (one continuous, fully autonomous action), a single
  `howToUse` entry describing that is enough.

Don't invent structure that isn't there — a short, simple skill legitimately
gets a short entry (no bullets, one `howToUse` line, a couple of tags). Match
the skill's actual depth; don't pad every entry to the same length.

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
- <category> / <name> — <one-line why> → proposed entry: {full object,
  including location/tags/descriptionIntro/descriptionBullets/howToUse per
  "Populating the deep fields for a new entry"}

### In catalog but not on disk (will NOT auto-remove)
- <category> / <name> — <branch/PR status signal> → recommend: keep note / update / remove

### Status / badge drift
- <category> / <name> — catalog: "<old>" → proposed: "<new>" (reason)

### Description drift
- <category> / <name> — catalog vs SKILL.md diff → proposed description

Nothing is applied except the auto-added skill until you approve per item.
```
