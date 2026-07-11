import { describe, expect, it } from "vitest";
import {
	ICON_CHEVRON_RIGHT,
	ICON_CHEVRONS_DOWN,
	ICON_CHEVRONS_UP,
	ICON_FILE_TEXT,
	ICON_MOON,
	ICON_SEARCH,
	ICON_SUN
} from "../src/icons";

describe("icons", () => {
	const icons = {
		ICON_SEARCH,
		ICON_SUN,
		ICON_MOON,
		ICON_CHEVRON_RIGHT,
		ICON_CHEVRONS_DOWN,
		ICON_CHEVRONS_UP,
		ICON_FILE_TEXT
	};

	it("renders each icon as a well-formed inline SVG", () => {
		for (const [name, markup] of Object.entries(icons)) {
			expect(markup, name).toMatch(/^<svg[^>]*>.*<\/svg>$/);
			expect(markup, name).toContain('fill="none"');
			expect(markup, name).toContain('stroke="currentColor"');
		}
	});

	it("gives every icon a distinct class name", () => {
		const classNames = Object.values(icons).map((markup) => markup.match(/class="([^"]+)"/)?.[1]);
		expect(new Set(classNames).size).toBe(classNames.length);
	});
});
