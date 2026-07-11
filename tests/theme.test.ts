import { describe, expect, it } from "vitest";
import { getPreferredTheme, readStoredTheme, writeStoredTheme } from "../src/theme";

function makeMemoryStorage(): Storage {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		clear: () => store.clear(),
		key: () => null,
		length: 0
	} as Storage;
}

describe("getPreferredTheme", () => {
	it("returns dark when the OS prefers dark", () => {
		expect(getPreferredTheme(true)).toBe("dark");
	});

	it("returns light when the OS prefers light", () => {
		expect(getPreferredTheme(false)).toBe("light");
	});
});

describe("stored theme round-trip", () => {
	it("returns null when nothing is stored", () => {
		expect(readStoredTheme(makeMemoryStorage())).toBeNull();
	});

	it("round-trips a written theme", () => {
		const storage = makeMemoryStorage();
		writeStoredTheme(storage, "dark");
		expect(readStoredTheme(storage)).toBe("dark");
	});

	it("returns null instead of throwing when storage access throws", () => {
		const throwingStorage = {
			getItem: () => {
				throw new Error("blocked");
			}
		} as unknown as Storage;
		expect(readStoredTheme(throwingStorage)).toBeNull();
	});

	it("does not throw when writing to storage that throws", () => {
		const throwingStorage = {
			setItem: () => {
				throw new Error("blocked");
			}
		} as unknown as Storage;
		expect(() => writeStoredTheme(throwingStorage, "dark")).not.toThrow();
	});
});
