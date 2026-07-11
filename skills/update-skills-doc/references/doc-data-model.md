# Doc Data Model & Scan Map

Everything needed to edit this project's `config.json`/`data.json` catalog
safely, beyond what's already in the project's root `SCHEMA.md` (read that
first for the exact field-by-field schema — it isn't repeated here).

## Table of contents
- [Where the scan map lives](#where-the-scan-map-lives)
- [One category per repo](#one-category-per-repo)
- [Canonical name & frontmatter](#canonical-name--frontmatter)
- [Populating the deep fields for a new entry](#populating-the-deep-fields-for-a-new-entry)
- [Shared / symlinked skills](#shared--symlinked-skills)
- [Grouped review template](#grouped-review-template)

## Where the scan map lives

There is no hardcoded folder→category table to keep in sync here.
`config.json`'s `categories[].scanPaths` field is the scan map *as far as
it's been told* — each category names its own glob-like locations, but that
list is only ever as complete as the last run that edited it. Don't treat it
as exhaustive. Every run does two things, not one:

1. **Search for locations it doesn't cover yet.** IDE/product built-in skill
   directories (e.g. `~/.cursor/skills-cursor/**/SKILL.md`), plugin/
   marketplace caches (e.g.
   `~/.cursor/plugins/cache/**/skills/**/SKILL.md`), and every repo in the
   user's workspace — open IDE folders and common dev roots — not just the
   repo this catalog lives in. Anything real found this way gets proposed as
   a new category or scanPath addition in the review (see the grouped review
   template below); it never gets added to `config.json` silently.
2. **Walk every `scanPath` that's already declared, in full.** A scan that
   only covers the categories/locations you happen to remember — typically
   the user's personal `~/.cursor/skills` — is a partial scan. It produces a
   catalog that *looks* complete (data.json has fresh entries!) while
   silently missing whole categories (`cursor-builtin`, a second repo, a
   plugin's skills) that were declared but never actually walked. That
   failure mode is worse than an obviously-stale catalog, because nothing
   about the output signals it happened.

Once you've found a real location — declared or newly discovered — this
skill picks up changes to `config.json`'s scan map automatically on the next
run; no skill-file edit is required for that part.

A folder counts as a skill only if it holds a `SKILL.md`.

## One category per repo

Every git repo gets its own category, named for that repo — never a shared
"project"/"repo" catch-all that spans more than one. This is the specific
mistake to watch for: a first repo (say, the one this catalog lives in) gets
a generic-sounding category like "project", and later a *second* repo's
skills get discovered and folded into that same category because the name
sounds general enough to fit. It isn't — "project" is really "this one
particular repo" wearing a generic label, and a second repo needs a category
of its own, not a spot inside the first repo's.

**Naming convention:** derive both `id` and `name` from the repo's own folder
name (the basename of its root directory, or its `git remote`'s repo name if
that's clearer) — lowercase-kebab for `id` (`on-prem`, `frontend`), Title
Case for `name` (`On-Prem`, `Frontend`). Don't invent a different name than
the repo's own.

**Scope:** a repo's category's `scanPaths` covers every skill directory
*inside that one repo* — `.cursor/skills/**/SKILL.md`, `.claude/skills/**/SKILL.md`,
or both, if the repo has both — and nothing from any other repo. Two repos
discovered in the same run are two category proposals, never one.

**Existing violations are drift too.** If you find a category whose
`scanPaths` already span more than one distinct repo (see the (e) CATEGORY
SCOPE bucket in the main workflow), that's not a shape to preserve or work
around — propose splitting it into one category per repo and reassigning the
affected skills' `categoryId`s, the same as any other drift.

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
(scanned beyond config.json: <list of locations actively searched for, e.g.
IDE built-ins, plugin caches, other workspace repos — or "none found")

### Missing scan locations (found on disk, not declared in config.json)
- <location> — <what's there, how many skills> → proposed: new category
  {id, name, color, description, scanPaths} | add to <category>'s scanPaths

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

### Category scope drift (one category spanning more than one repo)
- <category> — currently covers: <repo A>, <repo B> → proposed: split into
  <repo-A-category> {id, name, color, scanPaths} + <repo-B-category>
  {id, name, color, scanPaths}, reassigning <N> affected skills'
  categoryId accordingly

Nothing is applied except the auto-added skill until you approve per item.
```
