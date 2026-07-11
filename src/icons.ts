// Hand-picked icons from Lucide (https://lucide.dev, ISC license), vendored as raw inline
// SVG markup rather than an npm dependency — this keeps the project's only tools as
// esbuild/tsx/vitest and the shipped output a single dependency-free HTML file.

function icon(paths: string, name: string): string {
	return `<svg class="icon icon-${name}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export const ICON_SEARCH = icon(`<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />`, "search");

export const ICON_SUN = icon(
	`<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />`,
	"sun"
);

export const ICON_MOON = icon(
	`<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />`,
	"moon"
);

export const ICON_CHEVRON_RIGHT = icon(`<path d="m9 18 6-6-6-6" />`, "chevron-right");

export const ICON_CHEVRONS_DOWN = icon(`<path d="m7 6 5 5 5-5" /><path d="m7 13 5 5 5-5" />`, "chevrons-down");

export const ICON_CHEVRONS_UP = icon(`<path d="m17 11-5-5-5 5" /><path d="m17 18-5-5-5 5" />`, "chevrons-up");

export const ICON_FILE_TEXT = icon(
	`<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />`,
	"file-text"
);
