import { describe, expect, it, vi } from "vitest";
import {
	loadCopySheetConfig,
	parseCopySheetRows,
	readCopySheetTab,
	validateCopySheetHeader,
} from "./copy-sheet.mjs";

const response = (body, status = 200) =>
	new Response(JSON.stringify(body), { status });

describe("loadCopySheetConfig", () => {
	it("셸 환경변수에서 읽는다", () => {
		const { serviceAccount, spreadsheetId } = loadCopySheetConfig({
			env: {
				GA4_SERVICE_ACCOUNT_JSON: JSON.stringify({
					client_email: "a@b.com",
					private_key: "key",
				}),
				COPY_SHEET_ID: "sheet-id",
			},
			readFile: () => {
				throw new Error("파일을 읽지 않아야 한다");
			},
		});
		expect(spreadsheetId).toBe("sheet-id");
		expect(serviceAccount.client_email).toBe("a@b.com");
	});
	it("셸에 없으면 apps/web/.env.local에서 읽는다", () => {
		const serviceAccountJson = JSON.stringify({
			client_email: "a@b.com",
			private_key: "key",
		});
		const { spreadsheetId, serviceAccount } = loadCopySheetConfig({
			env: {},
			repoRoot: "/repo",
			readFile: (path) => {
				expect(path).toBe("/repo/apps/web/.env.local");

				return [
					`GA4_SERVICE_ACCOUNT_JSON='${serviceAccountJson}'`,
					'COPY_SHEET_ID="sheet-id"',
				].join("\n");
			},
		});
		expect(spreadsheetId).toBe("sheet-id");
		expect(serviceAccount.client_email).toBe("a@b.com");
	});
	it("둘 다 없으면 env:pull 안내를 담아 던진다", () => {
		expect(() =>
			loadCopySheetConfig({
				env: {},
				readFile: () => {
					throw new Error("no file");
				},
			}),
		).toThrow(/env:pull/);
	});
});

describe("validateCopySheetHeader", () => {
	it("앞 5열이 일치하면 통과하고, 오른쪽 추가 열은 허용한다", () => {
		expect(() =>
			validateCopySheetHeader(
				["키", "ko", "en", "사용 위치", "맥락", "비고"],
				"web",
			),
		).not.toThrow();
	});
	it("다르면 던진다", () => {
		expect(() => validateCopySheetHeader(["key", "ko"], "web")).toThrow(
			"헤더가 예상과 다릅니다",
		);
	});
});

describe("parseCopySheetRows", () => {
	it("행을 파싱하고 빈 키 행은 건너뛴다", () => {
		const rows = parseCopySheetRows(
			[
				["키", "ko", "en", "사용 위치", "맥락"],
				["common.save", "저장", "Save", "/memos", ""],
				["", "빈 키"],
			],
			"web",
		);
		expect(rows).toEqual([
			{
				key: "common.save",
				ko: "저장",
				en: "Save",
				location: "/memos",
				context: "",
				rowNumber: 2,
			},
		]);
	});
	it("같은 키가 중복되면 키와 행 번호를 담아 던진다", () => {
		expect(() =>
			parseCopySheetRows(
				[
					["키", "ko", "en", "사용 위치", "맥락"],
					["common.save", "저장"],
					["common.save", "저장하기"],
				],
				"web",
			),
		).toThrow(/common\.save.*2행.*3행/);
	});
});

describe("readCopySheetTab", () => {
	it("탭이 없으면 exists:false를 반환한다(빈 값)", async () => {
		const fetcher = vi.fn().mockResolvedValueOnce(response({}));
		const result = await readCopySheetTab({
			spreadsheetId: "sheet",
			serviceAccount: {},
			title: "web",
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(result).toEqual({ exists: false, rows: [] });
	});
	it("탭이 없으면(400) exists:false를 반환한다", async () => {
		const fetcher = vi.fn().mockResolvedValueOnce(response({}, 400));
		const result = await readCopySheetTab({
			spreadsheetId: "sheet",
			serviceAccount: {},
			title: "web",
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(result).toEqual({ exists: false, rows: [] });
	});
	it("403이면 서비스 계정 공유 안내를 담아 던진다", async () => {
		const fetcher = vi.fn().mockResolvedValueOnce(response({}, 403));
		await expect(
			readCopySheetTab({
				spreadsheetId: "sheet",
				serviceAccount: { client_email: "svc@example.com" },
				title: "web",
				fetcher,
				tokenExchanger: vi.fn(async () => "token"),
			}),
		).rejects.toThrow(/svc@example\.com/);
	});
	it("그 밖의 실패는 상태 코드를 담아 던진다", async () => {
		const fetcher = vi.fn(async () => response({}, 503));
		await expect(
			readCopySheetTab({
				spreadsheetId: "sheet",
				serviceAccount: {},
				title: "web",
				fetcher,
				tokenExchanger: vi.fn(async () => "token"),
				sleep: vi.fn(async () => {}),
			}),
		).rejects.toThrow("(503)");
	});
	it("정상 값이면 파싱한 행을 반환한다", async () => {
		const fetcher = vi.fn().mockResolvedValueOnce(
			response({
				values: [
					["키", "ko", "en", "사용 위치", "맥락"],
					["common.save", "저장", "Save", "/memos", ""],
				],
			}),
		);
		const result = await readCopySheetTab({
			spreadsheetId: "sheet",
			serviceAccount: {},
			title: "web",
			fetcher,
			tokenExchanger: vi.fn(async () => "token"),
		});
		expect(result.exists).toBe(true);
		expect(result.rows).toHaveLength(1);
	});
});
