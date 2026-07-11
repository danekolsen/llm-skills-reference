import { createServer } from "node:http";
import { readFileSync, watch, type WatchOptions } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runBuild } from "./build";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = resolve(ROOT, "config.json");
const DATA_PATH = resolve(ROOT, "data.json");
const OUT_PATH = resolve(ROOT, "dist/index.html");
const PORT = 4173;

async function rebuild(): Promise<void> {
	try {
		await runBuild(CONFIG_PATH, DATA_PATH, OUT_PATH);
		console.log("Rebuilt dist/index.html");
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
	}
}

function watchSafely(path: string, options: WatchOptions, onChange: () => void): void {
	try {
		watch(path, options, onChange);
	} catch (error) {
		console.warn(
			`Not watching ${path} (it may not exist yet; restart the dev server after creating it): ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

await rebuild();

watchSafely(resolve(ROOT, "src"), { recursive: true }, () => {
	void rebuild();
});
watchSafely(CONFIG_PATH, {}, () => {
	void rebuild();
});
watchSafely(DATA_PATH, {}, () => {
	void rebuild();
});

createServer((_request, response) => {
	try {
		const html = readFileSync(OUT_PATH, "utf-8");
		response.writeHead(200, { "Content-Type": "text/html" });
		response.end(html);
	} catch (error) {
		response.writeHead(500, { "Content-Type": "text/plain" });
		response.end(
			`dist/index.html not built yet: ${error instanceof Error ? error.message : String(error)}\n\nCreate config.json and data.json in the project root, then save any file to trigger a rebuild.`
		);
	}
}).listen(PORT, () => {
	console.log(`Serving dist/index.html at http://localhost:${PORT} (rebuilds on save)`);
});
