import { describe, expect, it, vi } from "vitest";
import { buildCopyPullPlan, pullCopyForApp } from "./pull-copy.mjs";

describe("buildCopyPullPlan", () => {
	it("시트 값이 JSON과 다르면 갱신 대상에 넣는다", () => {
		const { koUpdates, enUpdates, warnings } = buildCopyPullPlan({
			existingRows: [
				{ key: "common.save", ko: "저장하기", en: "Save", location: "", context: "", rowNumber: 2 },
			],
			koFlat: { "common.save": "저장" },
			enFlat: { "common.save": "Save" },
		});
		expect(koUpdates).toEqual({ "common.save": "저장하기" });
		expect(enUpdates).toEqual({});
		expect(warnings).toEqual([]);
	});
	it("빈 셀은 쓰지 않고 경고한다", () => {
		const { koUpdates, warnings } = buildCopyPullPlan({
			existingRows: [
				{ key: "common.save", ko: "", en: "Save", location: "", context: "", rowNumber: 2 },
			],
			koFlat: { "common.save": "저장" },
			enFlat: { "common.save": "Save" },
		});
		expect(koUpdates).toEqual({});
		expect(warnings).toEqual(["시트 키 'common.save'의 ko 셀이 비어 있어 쓰지 않습니다."]);
	});
	it("JSON에 없는 시트 행은 건너뛰고 경고한다", () => {
		const { koUpdates, enUpdates, warnings } = buildCopyPullPlan({
			existingRows: [
				{ key: "removed.key", ko: "x", en: "y", location: "", context: "", rowNumber: 2 },
			],
			koFlat: {},
			enFlat: {},
		});
		expect(koUpdates).toEqual({});
		expect(enUpdates).toEqual({});
		expect(warnings).toEqual(["시트 키 'removed.key'가 JSON에 없어 건너뜁니다."]);
	});
	it("시트에 없는 JSON 키는 유지하며 경고한다", () => {
		const { warnings } = buildCopyPullPlan({
			existingRows: [],
			koFlat: { "common.save": "저장" },
			enFlat: { "common.save": "Save" },
		});
		expect(warnings).toEqual(["JSON 키 'common.save'가 시트에 없습니다. copy:push 필요."]);
	});
});

describe("pullCopyForApp", () => {
	it("탭이 없으면 push 안내 경고와 함께 tab-missing을 반환한다", async () => {
		const result = await pullCopyForApp({
			app: "web",
			spreadsheetId: "sheet",
			serviceAccount: {},
			fetcher: async () => new Response(JSON.stringify({}), { status: 400 }),
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(result.status).toBe("tab-missing");
		expect(result.warnings[0]).toContain("copy:push를 먼저 실행하세요");
	});
	it("--check는 파일을 쓰지 않고 바뀔 키만 보고한다", async () => {
		const writeJsonFile = vi.fn();
		const formatFile = vi.fn();
		const result = await pullCopyForApp({
			app: "web",
			spreadsheetId: "sheet",
			serviceAccount: {},
			fetcher: async () =>
				new Response(
					JSON.stringify({
						values: [
							["키", "ko", "en", "사용 위치", "맥락"],
							["common.save", "저장하기", "Save", "/memos", ""],
						],
					}),
					{ status: 200 },
				),
			tokenExchanger: vi.fn(async () => "token"),
			readJsonFile: async () => ({ common: { save: "저장" } }),
			writeJsonFile,
			formatFile,
			check: true,
		});
		expect(result.status).toBe("checked");
		expect(result.changedKeys).toEqual(["common.save"]);
		expect(writeJsonFile).not.toHaveBeenCalled();
		expect(formatFile).not.toHaveBeenCalled();
	});
	it("바뀐 값이 있으면 파일을 쓰고 포맷 함수를 호출한다", async () => {
		const written = {};
		const formatFile = vi.fn();
		const result = await pullCopyForApp({
			app: "web",
			spreadsheetId: "sheet",
			serviceAccount: {},
			fetcher: async () =>
				new Response(
					JSON.stringify({
						values: [
							["키", "ko", "en", "사용 위치", "맥락"],
							["common.save", "저장하기", "Save", "/memos", ""],
						],
					}),
					{ status: 200 },
				),
			tokenExchanger: vi.fn(async () => "token"),
			readJsonFile: async (path) =>
				path.endsWith("ko/translation.json")
					? { common: { save: "저장" } }
					: { common: { save: "Save" } },
			writeJsonFile: async (path, value) => {
				written[path] = value;
			},
			formatFile,
		});
		expect(result.status).toBe("updated");
		expect(Object.values(written)[0].common.save).toBe("저장하기");
		expect(formatFile).toHaveBeenCalledTimes(1);
	});
});
