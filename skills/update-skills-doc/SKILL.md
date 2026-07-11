---
name: update-skills-doc
description: >-
  Reconcile this project's config.json/data.json skills catalog against every
  skill that actually exists on disk — searching far and wide for IDE
  built-in skills, plugin/marketplace skills, and repo-committed skills
  anywhere in the user's workspace, not just the categories/locations
  config.json already knows about — then edit data.json (and config.json
  when a whole category or scan location is missing) to fix drift: skills
  missing from the catalog, entries no longer on disk, stale status/PR
  badges, description drift, and repo-based skills lumped into the wrong
  category (every repo gets its own category, never a shared "project"
  catch-all). Surfaces one grouped review so you approve each change
  (except auto-adding a freshly built skill). Use whenever the
  user asks to update the skill catalog, sync data.json, regenerate/refresh
  the skills reference, catalog every AI skill available on their device, or
  check whether it's out of date, and as the final registration step after
  another skill-authoring workflow builds a new skill — even if the user
  doesn't name data.json explicitly.
---

# Update Skills Doc

The catalog in this project's `config.json`/`data.json` **drifts** two ways:
skills get built, renamed, merged, or deleted while the catalog stays still,
*and* whole categories of skills — an IDE's own built-ins, a plugin's
bundled skills, a repo the user started working in since the last run — go
uncataloged because no one ever pointed `config.json` at them. This skill
closes both kinds of drift. It's not a hardcoded scan list: it actively
searches the device for skills wherever they might live, walks every
location `config.json` already declares (in full — every category, not just
the familiar ones), compares what it finds against the catalog's data, and
edits the catalog back into agreement. The goal each run is the same: the
catalog should reflect every AI skill actually usable on this device, not a
convenient subset.

**Reconcile, don't regenerate.** `config.json`, the fields of `data.json`
you're not touching, and everything under `src/`/`scripts/` stay untouched;
every change lands inside `data.json`'s `skills` array. The one structural
exception is adding a whole missing category, which also needs a
`config.json` entry (with its own `color` and `scanPaths`). After edits, run
`npm run build` — it validates every `categoryId`/`dependsOn` foreign key and
regenerates `dist/index.html`; a build failure means the edit broke the
catalog.

Read [`references/doc-data-model.md`](references/doc-data-model.md) before
editing: it holds the canonical-name/shared-skill rules and the grouped-review
template. The `config.json`/`data.json` field reference itself lives in this
project's root [`SCHEMA.md`](../../SCHEMA.md) — read that for the exact
schema, don't duplicate it here.

## Branches

This skill runs one of two ways; the only difference is what may be applied
without asking:

- **Standalone** — triggered by the user ("update the skill catalog"). No
  change is applied without per-item approval.
- **Registration** — called by another skill-authoring workflow right after
  it builds a new skill, which passes in that **just-built skill** (its
  canonical name and folder path). That one skill's *add* is applied
  automatically; every other drift item still goes to the grouped review. You
  are in registration mode when a just-built skill was passed in, standalone
  otherwise. Nothing else differs — same scan, same diff, same review.

## Workflow

```
- [ ] 1. Fix the mode (standalone vs registration); note any just-built skill
- [ ] 2. Search far and wide for scan locations, then walk every one of them in full
- [ ] 3. Parse data.json's skills; index by categoryId + canonical name
- [ ] 4. Diff disk against data.json into the six drift buckets
- [ ] 5. Settle badge/status questions with a lightweight branch/PR check
- [ ] 6. Present ONE grouped review; auto-apply only the just-built skill
- [ ] 7. Apply approved edits to data.json/config.json, validate, and build
```

### 1. Fix the mode

Decide standalone vs registration from whether a just-built skill was passed.
In registration mode, record that skill's canonical name, folder, and target
category — it is the only entry you will add without asking. If you can't
tell whether a just-built skill was passed, treat the run as standalone.

**Done when:** the mode is named, and in registration mode the just-built
skill's name, path, and target category are recorded.

### 2. Search far and wide, then enumerate skills on disk

Two jobs, in this order — doing only the second one is the single most common
way this skill under-delivers, so don't skip the first because `config.json`
already declares *some* categories:

**a. Actively search for scan locations `config.json` doesn't know about
yet.** Its `categories[].scanPaths` are a starting point, not a ceiling —
they're only as complete as whoever last edited them remembered to make them.
The goal is a catalog of every AI skill actually usable on this device, which
means looking beyond what's already declared, every run. At minimum, check
for:

- **IDE/product built-in skills** — skills the IDE or CLI itself ships,
  distinct from anything the user authored (e.g. Cursor's own
  `~/.cursor/skills-cursor/**/SKILL.md`, or the equivalent bundled-skill
  directory for whatever tool you're running in).
- **Plugin/marketplace skills** — skills installed via a plugin manager into
  a cache directory (e.g. `~/.cursor/plugins/cache/**/skills/**/SKILL.md`).
- **Every repo in the user's workspace**, not only the repo this catalog
  happens to live in — check every open IDE workspace folder, plus common
  dev roots (e.g. `~/Development`, `~/Projects`, `~/code`), for
  `.cursor/skills/**/SKILL.md` and `.claude/skills/**/SKILL.md`. A catalog
  that only reflects its own repo's skills, or only the user's personal
  `~/.cursor/skills`, is under-scanned by construction — it takes real
  searching to find the rest.

Any real location you turn up that isn't covered by an existing category's
`scanPaths` is a discrepancy in its own right — a **missing scan location** —
to propose in the review (a new category, or an addition to an existing
category's `scanPaths`). Don't fold its skills into an existing category
silently, and don't decide on your own that a location is "not worth adding."

**If the location is a git repo, it gets its own category, named for that
repo.** Never propose folding a newly-found repo's skills into an existing
"project"/"repo" catch-all category alongside a *different* repo's skills —
that's the one mistake this step exists to prevent. One repo, one category;
two repos discovered in the same run are two separate category proposals,
each named after its own repo (see "One category per repo" in the reference
doc for the exact naming convention).

**b. Walk every `scanPath` that's already declared — every one, not just the
familiar ones.** Before diffing anything, write out the full list of
`(category, scanPath)` pairs from `config.json` and check each one off as you
walk it with a real filesystem search (glob/`find` against disk — never
substitute your own memory of what's installed for actually looking). It's
easy to scan the location you know best (typically the user's personal
`~/.cursor/skills`) and stop there, quietly skipping categories that point
somewhere less familiar — a different repo, an IDE built-in folder, a plugin
cache. That's exactly the partial scan this step exists to prevent, and it
produces false confidence: a catalog that looks complete but silently missed
entire categories. For each `scanPath`, record every folder that contains a
`SKILL.md`, resolving its canonical name and frontmatter (`name`,
`description`, invocation). Ignore non-skill files and any transient
`*-candidate-*` directories (skill-build scratch, not real skills).

**Read past the frontmatter for anything you'll be adding.** Frontmatter alone
is enough to detect drift, but a brand-new ADD entry needs more than
`name`/`description`/`invocation` — it needs `location`, `tags`, and ideally
`descriptionIntro`/`descriptionBullets`/`howToUse` too, or it lands in the
catalog barely filled in. For every skill headed for the ADD bucket, read the
whole `SKILL.md` body and derive those fields as described in "Populating the
deep fields for a new entry" in the reference doc — don't stop at frontmatter
just because the reconciliation logic technically doesn't need more.

**Done when:** you can name every location you actively searched for beyond
`config.json` (not just declare that you "checked"), every `(category,
scanPath)` pair from `config.json` has an explicit walked-and-found-N-skills
result with none skipped or assumed empty, any gaps are recorded as
missing-scan-location proposals, and every likely-ADD skill's full body has
been read for the deep fields.

### 3. Parse data.json

Read `data.json`'s `skills` array and index every entry by `(categoryId,
canonical name)`, keeping its current `invocation`, `status`, `shared`,
`description`, and `note`. Flag any category in `config.json` that has no
skills yet (e.g. a freshly added category).

**Done when:** every existing `data.json` entry is indexed and any
empty/missing category is flagged.

### 4. Diff into the six buckets

Sort every on-disk skill, every location you found beyond `config.json`,
every existing category, and every catalog entry into exactly one outcome —
accurate, or one of the six drift buckets:

- **(0) MISSING SCAN LOCATION** — a real skill folder exists somewhere
  `config.json` doesn't declare → propose a new category or an addition to an
  existing category's `scanPaths`. If the location is a git repo, the
  proposed category is scoped to that one repo and named for it — never
  merged into an existing category that already covers a *different* repo.
  Skills found there fall into bucket (a) once the location itself is
  approved.
- **(a) ADD** — on disk, missing from the catalog → new entry to add.
- **(b) CATALOG-ONLY** — in `data.json`, absent from disk → surface as an
  unmerged branch, rename, or deletion. Recommend; **never remove on your
  own**.
- **(c) BADGE/STATUS drift** — entry exists but `invocation`, `status`,
  `shared`, or `note` disagrees with disk or with merge state.
- **(d) DESCRIPTION drift** — entry exists but its `description` differs
  meaningfully from the `SKILL.md` frontmatter (ignore pure
  whitespace/quote differences).
- **(e) CATEGORY SCOPE drift** — an existing category's `scanPaths` cover
  more than one distinct repo (see "One category per repo" in the reference
  doc) → propose splitting it into one category per repo and reassigning
  each affected skill's `categoryId` to its new home. This is what a
  "project"/"repo" catch-all category degenerates into once a second repo's
  skills get added to it instead of getting their own category — treat it as
  drift to fix, not a shape to preserve.

Account for every scanned skill, every discovered-but-undeclared location,
every existing category's scope, and every catalog entry; a skill left
unclassified is the drift you were sent to catch.

**Done when:** every on-disk skill, every newly-discovered location, every
existing category, and every catalog entry sits in exactly one bucket or is
confirmed accurate, with nothing unclassified.

### 5. Settle badge/status questions

For CATALOG-ONLY and BADGE/STATUS items that hinge on merge state (a
`status: "Draft PR #…"` badge, a `note` about an unmerged branch), run a
lightweight check to inform your recommendation: prefer whatever git-hosting
MCP tool is available (PR/issue detail lookup), else `gh pr view` when the
`gh` CLI is present. Turn each into a concrete recommendation ("PR #1919
merged → drop the status badge and branch note"). If neither is available,
say so and recommend based on whether the skill file now exists at its
expected location. **Recommendations only — the flip itself waits for the
review.**

**Done when:** every merge-dependent item carries a recommendation backed by a
branch/PR check, or is marked "couldn't determine" with the reason.

### 6. Present one grouped review

Show a **single** review, grouped by bucket (MISSING SCAN LOCATION / ADD /
CATALOG-ONLY / BADGE-STATUS / DESCRIPTION / CATEGORY SCOPE), each item with
its current value, proposed value, and a per-item approve/skip. One review,
not a prompt per skill — use the template in the data model reference. In
registration mode, apply the just-built skill's ADD first and list it as
"auto-added"; everything else waits for approval.

**Non-interactive fallback:** if there is no way to collect per-item approval
(e.g. an automated caller with no user present), apply only the safe automatic
change (the just-built skill in registration mode) and present the remaining
buckets as a clearly labeled "proposed, not yet applied" report for the user
to action later. Never apply the rest silently.

**Done when:** every drift item has an explicit approve or skip (the
just-built skill counting as auto-approved), so the edit set for step 7 is
fully decided.

### 7. Apply approved edits and confirm

Edit `data.json`'s `skills` array directly: add/update/remove only the
affected skill objects, matching the existing field order and using tabs like
the rest of the file — this is real JSON, so parse it, mutate the
deserialized structure, and write it back, rather than hand-patching text. New
ADD entries should carry the deep fields derived in step 2 (`location`,
`tags`, and `descriptionIntro`/`descriptionBullets`/`howToUse` where the
skill's body supports them) — a bare `name`/`description`/`summary` entry is
a regression, not a shortcut. For an approved missing-scan-location item, add
either a whole new category as a new object in `config.json`'s `categories`
array (with a `color` and `scanPaths`, following the shape of the existing
categories) or a new entry in an existing category's `scanPaths` array,
whichever the review proposed. For an approved category-scope split, add one
new category per repo (each with its own `color` and only that repo's
`scanPaths`), update or remove the old catch-all category, and update every
affected skill's `categoryId` in `data.json` to its new home. Skipped items
are left untouched and recorded as deferred.

Then run `npm run build` to confirm: it validates that every skill's
`categoryId` resolves and every `dependsOn` id resolves (see `SCHEMA.md`), and
regenerates `dist/index.html`. A failed build means an edit introduced a
dangling reference — fix it before finishing. Summarize applied / skipped /
deferred items.

**Done when:** `npm run build` succeeds, all approved edits (and the
registration auto-add) are present in `data.json`/`config.json`, skipped items
are unchanged, and the summary is given.

## Guardrails

- **Search, don't recall.** `config.json`'s declared `scanPaths` and your own
  memory of what's installed are both starting points, not verification —
  walk every declared location for real, and actively look for locations
  that aren't declared yet, every run. A run that only covers personal
  `~/.cursor/skills` is incomplete even if it finds real drift there.
- **One automatic change only:** the just-built skill add in registration
  mode. Everything else needs approval — including a newly-discovered scan
  location, which gets proposed, never added silently.
- **One category per repo, always.** A repo's skills never get folded into a
  category that already covers a different repo, even under a
  generic-sounding name like "project" or "repo" — that's the specific
  mistake this skill exists to catch, both when adding a newly-found repo
  and when reviewing categories that already exist.
- **Never delete** a catalog entry automatically — catalog-only entries are
  surfaced, not removed.
- **Never flip** a badge/status/description without approval, even when a PR
  status check says it's safe.
- **Edit `data.json`/`config.json` directly** — never touch `src/` (rendering,
  validation, or search logic) or `scripts/`.
- **Recursion guard:** never invoke whatever skill-authoring workflow called
  you in registration mode. This skill is always the callee, never the
  caller.
