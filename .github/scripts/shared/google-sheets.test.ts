import { describe, expect, it, vi } from "vitest";
import {
	ensureGoogleSheetTab,
	readGoogleSheetValues,
	upsertGoogleSheetTables,
	writeGoogleSheetRanges,
} from "./google-sheets.mjs";

const response = (body, status = 200) =>
	new Response(JSON.stringify(body), { status });
const properties = {
	title: "SEO Runs",
	sheetId: 1,
	gridProperties: { rowCount: 1000, columnCount: 26 },
};
const createOptions = () => ({
	spreadsheetId: "spreadsheet",
	serviceAccount: {},
	tokenExchanger: vi.fn(async () => "token"),
	sleep: vi.fn(async () => {}),
	tables: [
		{
			title: "SEO Runs",
			headers: ["기록 키", "횟수"],
			legacyHeaders: ["key", "count"],
			rows: [
				["123:1", 3],
				["124:1", 4],
			],
		},
	],
});

describe("upsertGoogleSheetTables", () => {
	it("없는 탭을 생성하고 헤더와 행을 RAW 배치로 저장한다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(response({ sheets: [] }))
			.mockResolvedValueOnce(
				response({ replies: [{ addSheet: { properties } }] }),
			)
			.mockResolvedValueOnce(response({ valueRanges: [{}, {}] }))
			.mockResolvedValueOnce(response({}));
		const options = createOptions();
		expect(await upsertGoogleSheetTables({ ...options, fetcher })).toEqual({
			updatedRows: 2,
		});
		expect(options.tokenExchanger).toHaveBeenCalledWith({
			serviceAccount: {},
			scope: "https://www.googleapis.com/auth/spreadsheets",
		});
		expect(
			JSON.parse(fetcher.mock.calls[1][1].body).requests[0].addSheet.properties
				.title,
		).toBe("SEO Runs");
		expect(JSON.parse(fetcher.mock.calls[3][1].body)).toEqual({
			valueInputOption: "RAW",
			data: [
				{ range: "'SEO Runs'!A1", values: [["기록 키", "횟수"]] },
				{ range: "'SEO Runs'!A2", values: [["123:1", 3]] },
				{ range: "'SEO Runs'!A3", values: [["124:1", 4]] },
			],
		});
	});
	it("기존 키는 같은 행에 갱신하고 신규 키만 마지막에 추가한다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(response({ sheets: [{ properties }] }))
			.mockResolvedValueOnce(
				response({
					valueRanges: [
						{ values: [["기록 키", "횟수"]] },
						{ values: [["old"], ["123:1"]] },
					],
				}),
			)
			.mockResolvedValueOnce(response({}));
		await upsertGoogleSheetTables({ ...createOptions(), fetcher });
		expect(JSON.parse(fetcher.mock.calls[2][1].body).data).toEqual([
			{ range: "'SEO Runs'!A3", values: [["123:1", 3]] },
			{ range: "'SEO Runs'!A4", values: [["124:1", 4]] },
		]);
	});
	it("데이터가 그리드를 넘어가면 쓰기 전에 확장한다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(
				response({
					sheets: [
						{
							properties: {
								...properties,
								gridProperties: { rowCount: 2, columnCount: 1 },
							},
						},
					],
				}),
			)
			.mockResolvedValueOnce(
				response({
					valueRanges: [{ values: [["key", "count"]] }, { values: [["old"]] }],
				}),
			)
			.mockResolvedValueOnce(response({}))
			.mockResolvedValueOnce(response({}));
		await upsertGoogleSheetTables({ ...createOptions(), fetcher });
		expect(
			JSON.parse(fetcher.mock.calls[2][1].body).requests[0]
				.updateSheetProperties.properties.gridProperties,
		).toEqual({ rowCount: 4, columnCount: 2 });
	});
	it("영문 헤더만 한글로 바꾸고 기존 수동 변경 기록 행은 쓰지 않는다", async () => {
		const options = createOptions();
		options.tables = [
			{
				title: "SEO Changes",
				headers: ["기록 키", "비고"],
				legacyHeaders: ["key", "notes"],
				rows: [],
			},
		];
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(
				response({
					sheets: [{ properties: { ...properties, title: "SEO Changes" } }],
				}),
			)
			.mockResolvedValueOnce(
				response({
					valueRanges: [
						{ values: [["key", "notes"]] },
						{ values: [["manual-change-1"], [], ["manual-change-2"]] },
					],
				}),
			)
			.mockResolvedValueOnce(response({}));
		expect(await upsertGoogleSheetTables({ ...options, fetcher })).toEqual({
			updatedRows: 0,
		});
		expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({
			valueInputOption: "RAW",
			data: [{ range: "'SEO Changes'!A1", values: [["기록 키", "비고"]] }],
		});
	});
	it("레거시 헤더를 교체하면서 기존 데이터 위치를 유지하고 새 행만 추가한다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(response({ sheets: [{ properties }] }))
			.mockResolvedValueOnce(
				response({
					valueRanges: [
						{ values: [["key", "count"]] },
						{ values: [["old"], ["123:1"]] },
					],
				}),
			)
			.mockResolvedValueOnce(response({}));
		await upsertGoogleSheetTables({ ...createOptions(), fetcher });
		expect(JSON.parse(fetcher.mock.calls[2][1].body).data).toEqual([
			{ range: "'SEO Runs'!A1", values: [["기록 키", "횟수"]] },
			{ range: "'SEO Runs'!A3", values: [["123:1", 3]] },
			{ range: "'SEO Runs'!A4", values: [["124:1", 4]] },
		]);
	});
	it("레거시와 현재 헤더의 열 수가 다르면 요청 전에 거절한다", async () => {
		const options = createOptions();
		options.tables[0].legacyHeaders = ["key"];
		const fetcher = vi.fn();
		await expect(
			upsertGoogleSheetTables({ ...options, fetcher }),
		).rejects.toThrow("legacy header width mismatch");
		expect(fetcher).not.toHaveBeenCalled();
	});
	it("헤더가 다르면 기존 데이터를 덮어쓰지 않는다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(response({ sheets: [{ properties }] }))
			.mockResolvedValueOnce(
				response({ valueRanges: [{ values: [["unexpected"]] }, {}] }),
			);
		await expect(
			upsertGoogleSheetTables({ ...createOptions(), fetcher }),
		).rejects.toThrow("header mismatch");
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it("429와 5xx 오류를 지수 백오프로 재시도한다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(response({}, 429))
			.mockResolvedValueOnce(response({}, 503))
			.mockResolvedValueOnce(response({ sheets: [{ properties }] }))
			.mockResolvedValueOnce(response({ valueRanges: [{}, {}] }))
			.mockResolvedValueOnce(response({}));
		const options = createOptions();
		await upsertGoogleSheetTables({ ...options, fetcher });
		expect(options.sleep.mock.calls).toEqual([[1000], [2000]]);
	});
	it("재시도는 세 번까지이며 인증 오류는 재시도하지 않는다", async () => {
		for (const status of [503, 403]) {
			const fetcher = vi.fn(async () => response({}, status));
			await expect(
				upsertGoogleSheetTables({ ...createOptions(), fetcher }),
			).rejects.toThrow(`(${status})`);
			expect(fetcher).toHaveBeenCalledTimes(status === 503 ? 3 : 1);
		}
	});
	it("입력 키가 중복되면 요청 전에 거절한다", async () => {
		const options = createOptions();
		options.tables[0].rows.push(["123:1", 5]);
		const fetcher = vi.fn();
		await expect(
			upsertGoogleSheetTables({ ...options, fetcher }),
		).rejects.toThrow("duplicate key");
		expect(fetcher).not.toHaveBeenCalled();
	});
});

describe("readGoogleSheetValues", () => {
	it("탭의 전체 값을 읽는다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(response({ values: [["a", "b"], ["1", "2"]] }));
		const values = await readGoogleSheetValues({
			spreadsheetId: "spreadsheet",
			serviceAccount: {},
			title: "web",
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(values).toEqual([["a", "b"], ["1", "2"]]);
		expect(fetcher.mock.calls[0][0]).toContain("/values/'web'");
	});
	it("값이 없으면 빈 배열을 반환한다", async () => {
		const fetcher = vi.fn().mockResolvedValueOnce(response({}));
		const values = await readGoogleSheetValues({
			spreadsheetId: "spreadsheet",
			serviceAccount: {},
			title: "web",
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(values).toEqual([]);
	});
});

describe("writeGoogleSheetRanges", () => {
	it("여러 범위를 한 번의 batchUpdate로 쓴다", async () => {
		const fetcher = vi.fn().mockResolvedValueOnce(response({}));
		await writeGoogleSheetRanges({
			spreadsheetId: "spreadsheet",
			serviceAccount: {},
			ranges: [{ range: "'web'!D2", values: [["사용 위치"]] }],
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher.mock.calls[0][0]).toContain("/values:batchUpdate");
		expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
			valueInputOption: "RAW",
			data: [{ range: "'web'!D2", values: [["사용 위치"]] }],
		});
	});
	it("범위가 없으면 요청을 보내지 않는다", async () => {
		const fetcher = vi.fn();
		await writeGoogleSheetRanges({
			spreadsheetId: "spreadsheet",
			serviceAccount: {},
			ranges: [],
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(fetcher).not.toHaveBeenCalled();
	});
});

describe("ensureGoogleSheetTab", () => {
	it("탭이 없으면 만들고 헤더 행을 쓴다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(response({ sheets: [] }))
			.mockResolvedValueOnce(response({}))
			.mockResolvedValueOnce(response({}));
		const result = await ensureGoogleSheetTab({
			spreadsheetId: "spreadsheet",
			serviceAccount: {},
			title: "web",
			headers: ["키", "ko", "en", "사용 위치", "맥락"],
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(result).toEqual({ created: true });
		expect(fetcher).toHaveBeenCalledTimes(3);
		expect(
			JSON.parse(fetcher.mock.calls[1][1].body).requests[0].addSheet.properties
				.title,
		).toBe("web");
		expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({
			valueInputOption: "RAW",
			data: [
				{
					range: "'web'!A1",
					values: [["키", "ko", "en", "사용 위치", "맥락"]],
				},
			],
		});
	});
	it("탭이 있으면 아무 요청도 보내지 않는다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(response({ sheets: [{ properties: { title: "web" } }] }));
		const result = await ensureGoogleSheetTab({
			spreadsheetId: "spreadsheet",
			serviceAccount: {},
			title: "web",
			headers: ["키", "ko", "en", "사용 위치", "맥락"],
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(result).toEqual({ created: false });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
});
