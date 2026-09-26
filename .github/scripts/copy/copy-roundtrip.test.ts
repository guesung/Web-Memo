import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COPY_TARGET_FILES, readJsonFile, writeJsonFile } from "./copy-files.mjs";
import { pushCopyForApp } from "./push-copy.mjs";
import { pullCopyForApp } from "./pull-copy.mjs";

let repoRoot;

afterEach(() => {
	if (repoRoot) {
		rmSync(repoRoot, { recursive: true, force: true });
	}
});

const writeAt = (relativePath, content) => {
	const fullPath = join(repoRoot, relativePath);
	mkdirSync(dirname(fullPath), { recursive: true });
	writeFileSync(fullPath, content);
};

describe("copy push → pull 왕복", () => {
	it("메모리 가짜 시트에 push한 뒤 pull하면 네 JSON 파일 바이트가 그대로다", async () => {
		repoRoot = mkdtempSync(join(tmpdir(), "copy-roundtrip-"));
		const webKo = `${JSON.stringify({ common: { save: "저장", close: "닫기" } }, null, "\t")}\n`;
		const webEn = `${JSON.stringify({ common: { save: "Save", close: "Close" } }, null, "\t")}\n`;
		const extKo = `${JSON.stringify(
			{ toast_error_save: { message: "저장 실패", description: "설명" } },
			null,
			"\t",
		)}\n`;
		const extEn = `${JSON.stringify(
			{ toast_error_save: { message: "Save failed", description: "설명" } },
			null,
			"\t",
		)}\n`;
		writeAt(COPY_TARGET_FILES.web.ko, webKo);
		writeAt(COPY_TARGET_FILES.web.en, webEn);
		writeAt(COPY_TARGET_FILES.extension.ko, extKo);
		writeAt(COPY_TARGET_FILES.extension.en, extEn);

		const tabs = new Map();
		const fetcher = createFakeSheetsFetcher(tabs);
		const tokenExchanger = vi.fn(async () => "token");
		const readJson = (path) => readJsonFile(join(repoRoot, path));
		const writeJson = (path, value) => writeJsonFile(join(repoRoot, path), value);

		for (const app of ["web", "extension"]) {
			const result = await pushCopyForApp({
				app,
				spreadsheetId: "sheet",
				serviceAccount: {},
				fetcher,
				tokenExchanger,
				readJsonFile: readJson,
				scanUsages: () => ({ web: {}, extension: {} }),
				repoRoot,
			});
			expect(result.excludedKeys).toEqual([]);
		}

		for (const app of ["web", "extension"]) {
			const result = await pullCopyForApp({
				app,
				spreadsheetId: "sheet",
				serviceAccount: {},
				fetcher,
				tokenExchanger,
				readJsonFile: readJson,
				writeJsonFile: writeJson,
				formatFile: async () => {},
			});
			expect(result.status).toBe("unchanged");
			expect(result.changedKeys).toEqual([]);
		}

		expect(readFileSync(join(repoRoot, COPY_TARGET_FILES.web.ko), "utf8")).toBe(webKo);
		expect(readFileSync(join(repoRoot, COPY_TARGET_FILES.web.en), "utf8")).toBe(webEn);
		expect(readFileSync(join(repoRoot, COPY_TARGET_FILES.extension.ko), "utf8")).toBe(extKo);
		expect(readFileSync(join(repoRoot, COPY_TARGET_FILES.extension.en), "utf8")).toBe(extEn);
	});
});

function createFakeSheetsFetcher(tabs) {
	return async (url, init) => {
		const method = init?.method ?? "GET";
		const body = init?.body ? JSON.parse(init.body) : undefined;
		if (method === "GET" && url.includes("?fields=sheets.properties")) {
			return jsonResponse({
				sheets: [...tabs.keys()].map((title) => ({
					properties: { title, sheetId: 1, gridProperties: { rowCount: 1000, columnCount: 26 } },
				})),
			});
		}
		if (method === "POST" && url.endsWith(":batchUpdate") && !url.includes("/values:batchUpdate")) {
			const replies = [];
			for (const request of body.requests) {
				if (request.addSheet) {
					const title = request.addSheet.properties.title;
					if (!tabs.has(title)) {
						tabs.set(title, []);
					}
					replies.push({
						addSheet: {
							properties: { title, sheetId: tabs.size, gridProperties: { rowCount: 1000, columnCount: 26 } },
						},
					});
				}
			}

			return jsonResponse({ replies });
		}
		if (method === "POST" && url.endsWith("/values:batchUpdate")) {
			for (const { range, values } of body.data) {
				applyFakeWrite(tabs, range, values);
			}

			return jsonResponse({});
		}
		if (method === "GET" && url.includes("/values/")) {
			const titleQuoted = url.split("/values/")[1];
			const title = titleQuoted.slice(1, -1).replaceAll("''", "'");
			if (!tabs.has(title)) {
				return jsonResponse({}, 400);
			}

			return jsonResponse({ values: tabs.get(title).map((row) => row.map((cell) => cell ?? "")) });
		}
		throw new Error(`unhandled fake sheets request: ${method} ${url}`);
	};
}

function applyFakeWrite(tabs, range, values) {
	const [titleQuoted, cellRef] = range.split("!");
	const title = titleQuoted.slice(1, -1).replaceAll("''", "'");
	const rows = tabs.get(title);
	const match = /^([A-Z]+)(\d+)$/.exec(cellRef);
	const colStart = columnIndex(match[1]);
	const rowStart = Number(match[2]);
	values.forEach((rowValues, rowOffset) => {
		const rowIndex = rowStart - 1 + rowOffset;
		while (rows.length <= rowIndex) {
			rows.push([]);
		}
		rowValues.forEach((value, colOffset) => {
			rows[rowIndex][colStart + colOffset] = value;
		});
	});
}

function columnIndex(letters) {
	let index = 0;
	for (const char of letters) {
		index = index * 26 + (char.charCodeAt(0) - 64);
	}

	return index - 1;
}

function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), { status });
}
