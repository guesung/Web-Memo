import { describe, expect, it, vi } from "vitest";
import { buildCopyPushPlan, buildLocationCell, pushCopyForApp } from "./push-copy.mjs";

describe("buildLocationCell", () => {
	it("사용처가 없으면 미확인 라벨을 쓴다", () => {
		expect(buildLocationCell(undefined)).toBe("미확인 (동적 또는 미사용)");
		expect(buildLocationCell([])).toBe("미확인 (동적 또는 미사용)");
	});
	it("사용처를 라벨 (파일:라인) 형태로 줄바꿈 연결한다", () => {
		expect(
			buildLocationCell([
				{ location: "/memos", file: "a.tsx", line: 1 },
				{ location: "/memos", file: "b.tsx", line: 2 },
			]),
		).toBe("/memos (a.tsx:1)\n/memos (b.tsx:2)");
	});
	it("같은 라벨은 중복 제거한다", () => {
		expect(
			buildLocationCell([
				{ location: "/memos", file: "a.tsx", line: 1 },
				{ location: "/memos", file: "a.tsx", line: 1 },
			]),
		).toBe("/memos (a.tsx:1)");
	});
});

describe("buildCopyPushPlan", () => {
	it("새 키는 행을 추가하고, 기존 키는 D열만 갱신한다", () => {
		const plan = buildCopyPushPlan({
			tabTitle: "web",
			existingRows: [
				{ key: "common.save", ko: "저장", en: "Save", location: "", context: "", rowNumber: 2 },
			],
			koFlat: { "common.save": "저장", "common.close": "닫기" },
			enFlat: { "common.save": "Save", "common.close": "Close" },
			usages: { "common.close": [{ location: "/memos", file: "a.tsx", line: 1 }] },
		});
		expect(plan.added).toBe(1);
		expect(plan.updated).toBe(1);
		expect(plan.ranges).toEqual(
			expect.arrayContaining([
				{ range: "'web'!D2", values: [["미확인 (동적 또는 미사용)"]] },
				{
					range: "'web'!A3",
					values: [["common.close", "닫기", "Close", "/memos (a.tsx:1)"]],
				},
			]),
		);
	});
	it("시트에만 있는 키는 D열에 JSON에 없음을 쓴다", () => {
		const plan = buildCopyPushPlan({
			tabTitle: "web",
			existingRows: [
				{ key: "removed.key", ko: "x", en: "y", location: "", context: "", rowNumber: 2 },
			],
			koFlat: {},
			enFlat: {},
			usages: {},
		});
		expect(plan.added).toBe(0);
		expect(plan.updated).toBe(1);
		expect(plan.ranges).toEqual([
			{ range: "'web'!D2", values: [["JSON에 없음"]] },
		]);
	});
});

describe("pushCopyForApp", () => {
	it("탭이 없으면 만들고 전체 키를 추가한다", async () => {
		const tabs = new Map();
		const fetcher = createFakeSheetsFetcher(tabs);
		const result = await pushCopyForApp({
			app: "web",
			spreadsheetId: "sheet",
			serviceAccount: {},
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
			readJsonFile: async (path) =>
				path.endsWith("ko/translation.json")
					? { common: { save: "저장" }, updates: { v1: "제외" } }
					: { common: { save: "Save" } },
			scanUsages: () => ({ web: {}, extension: {} }),
			repoRoot: "/repo",
		});
		expect(result.added).toBe(1);
		expect(result.updated).toBe(0);
		expect(result.excludedKeys).toEqual([]);
		expect(tabs.get("web")[0]).toEqual(["키", "ko", "en", "사용 위치", "맥락"]);
		expect(tabs.get("web")[1]).toEqual([
			"common.save",
			"저장",
			"Save",
			"미확인 (동적 또는 미사용)",
		]);
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
