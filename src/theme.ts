export type Theme = "light" | "dark";

const STORAGE_KEY = "skills-reference-theme";

export function getPreferredTheme(prefersDark: boolean): Theme {
	return prefersDark ? "dark" : "light";
}

export function readStoredTheme(storage: Storage | undefined): Theme | null {
	try {
		const value = storage?.getItem(STORAGE_KEY);
		return value === "light" || value === "dark" ? value : null;
	} catch {
		return null;
	}
}

export function writeStoredTheme(storage: Storage | undefined, theme: Theme): void {
	try {
		storage?.setItem(STORAGE_KEY, theme);
	} catch {
		// localStorage can be unavailable or inconsistent on file:// origins; ignore.
	}
}
