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
