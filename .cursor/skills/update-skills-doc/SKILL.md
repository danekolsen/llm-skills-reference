---
name: update-skills-doc
description: >-
  Reconcile this project's config.json/data.json skills catalog against the
  skills that actually exist on disk across every category's configured scan
  locations, then edit data.json (and config.json when a whole category is
  missing) to fix drift — skills missing from the catalog, entries no longer
  on disk, stale status/PR badges, and description drift — surfacing one
  grouped review so you approve each change (except auto-adding a freshly
  built skill). Use whenever the user asks to update the skill catalog, sync
  data.json, regenerate/refresh the skills reference, or check whether it's
  out of date, and as the final registration step after another skill-
  authoring workflow builds a new skill — even if the user doesn't name
  data.json explicitly.
---

# Update Skills Doc

The catalog in this project's `config.json`/`data.json` **drifts**: skills get
built, renamed, merged, or deleted while the catalog stays still. This skill
closes that drift — it reads every skill on disk (using the scan locations
*declared in `config.json`*, not a hardcoded list), compares it against the
catalog's data, and edits the catalog back into agreement.

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
project's root [`SCHEMA.md`](../../../SCHEMA.md) — read that for the exact
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
- [ ] 2. Read config.json; enumerate every skill on disk across its scan locations, with canonical names
- [ ] 3. Parse data.json's skills; index by categoryId + canonical name
- [ ] 4. Diff disk against data.json into the four drift buckets
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

### 2. Read config.json and enumerate skills on disk

Read `config.json` first — its `categories[].scanPaths` **are** the scan map;
there's no separate hardcoded table to consult. Walk every location across
every category's `scanPaths` and record each folder that contains a
`SKILL.md`. Resolve each to its canonical name and read its frontmatter for
`name`, `description`, and invocation. A partial scan produces false
"catalog-only" drift, so the bar is **total coverage, not a sample**. Ignore
non-skill files and any transient `*-candidate-*` directories (skill-build
scratch, not real skills).

**Read past the frontmatter for anything you'll be adding.** Frontmatter alone
is enough to detect drift, but a brand-new ADD entry needs more than
`name`/`description`/`invocation` — it needs `location`, `tags`, and ideally
`descriptionIntro`/`descriptionBullets`/`howToUse` too, or it lands in the
catalog barely filled in. For every skill headed for the ADD bucket, read the
whole `SKILL.md` body and derive those fields as described in "Populating the
deep fields for a new entry" in the reference doc — don't stop at frontmatter
just because the reconciliation logic technically doesn't need more.

**Done when:** every category's `scanPaths` has been walked, every `SKILL.md`
folder recorded with its canonical name, description, and invocation — no
location skipped — and every likely-ADD skill's full body has been read for
the deep fields.

### 3. Parse data.json

Read `data.json`'s `skills` array and index every entry by `(categoryId,
canonical name)`, keeping its current `invocation`, `status`, `shared`,
`description`, and `note`. Flag any category in `config.json` that has no
skills yet (e.g. a freshly added category).

**Done when:** every existing `data.json` entry is indexed and any
empty/missing category is flagged.

### 4. Diff into the four buckets

Sort every on-disk skill and every catalog entry into exactly one outcome —
accurate, or one of the four drift buckets:

- **(a) ADD** — on disk, missing from the catalog → new entry to add.
- **(b) CATALOG-ONLY** — in `data.json`, absent from disk → surface as an
  unmerged branch, rename, or deletion. Recommend; **never remove on your
  own**.
- **(c) BADGE/STATUS drift** — entry exists but `invocation`, `status`,
  `shared`, or `note` disagrees with disk or with merge state.
- **(d) DESCRIPTION drift** — entry exists but its `description` differs
  meaningfully from the `SKILL.md` frontmatter (ignore pure
  whitespace/quote differences).

Account for every scanned skill and every catalog entry; a skill left
unclassified is the drift you were sent to catch.

**Done when:** every on-disk skill and every catalog entry sits in exactly one
bucket or is confirmed accurate, with nothing unclassified.

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

Show a **single** review, grouped by bucket (ADD / CATALOG-ONLY /
BADGE-STATUS / DESCRIPTION), each item with its current value, proposed
value, and a per-item approve/skip. One review, not a prompt per skill — use
the template in the data model reference. In registration mode, apply the
just-built skill's ADD first and list it as "auto-added"; everything else
waits for approval.

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
a regression, not a shortcut. Add a missing category as a new object in
`config.json`'s `categories` array (with a `color` and `scanPaths`), following
the shape of the existing categories. Skipped items are left untouched and
recorded as deferred.

Then run `npm run build` to confirm: it validates that every skill's
`categoryId` resolves and every `dependsOn` id resolves (see `SCHEMA.md`), and
regenerates `dist/index.html`. A failed build means an edit introduced a
dangling reference — fix it before finishing. Summarize applied / skipped /
deferred items.

**Done when:** `npm run build` succeeds, all approved edits (and the
registration auto-add) are present in `data.json`/`config.json`, skipped items
are unchanged, and the summary is given.

## Guardrails

- **One automatic change only:** the just-built skill add in registration
  mode. Everything else needs approval.
- **Never delete** a catalog entry automatically — catalog-only entries are
  surfaced, not removed.
- **Never flip** a badge/status/description without approval, even when a PR
  status check says it's safe.
- **Edit `data.json`/`config.json` directly** — never touch `src/` (rendering,
  validation, or search logic) or `scripts/`.
- **Recursion guard:** never invoke whatever skill-authoring workflow called
  you in registration mode. This skill is always the callee, never the
  caller.
