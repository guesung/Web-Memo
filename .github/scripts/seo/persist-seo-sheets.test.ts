// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { appendFile, readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
	appendFile: vi.fn(),
	readFile: vi.fn(),
}));
vi.mock("./seo-sheets.mjs", () => ({
	createSeoSheetTables: vi.fn(() => [
		{ title: "SEO Runs", headers: ["key"], rows: [["1:1"]] },
	]),
}));
vi.mock("../shared/google-sheets.mjs", () => ({
	upsertGoogleSheetTables: vi.fn(async () => ({ updatedRows: 1 })),
}));

import { persistSeoReportsToSheets } from "./persist-seo-sheets.mjs";
import { upsertGoogleSheetTables } from "../shared/google-sheets.mjs";
import { createSeoSheetTables } from "./seo-sheets.mjs";

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllEnvs();
});

describe("SEO Google Sheets 적재 CLI", () => {
	it("설정이 없으면 검사를 실패시키지 않고 건너뛴다", async () => {
		const result = await persistSeoReportsToSheets({
			spreadsheetId: "",
			serviceAccountJson: "",
		});

		expect(result).toEqual({ status: "skipped", updatedRows: 0 });
		expect(readFile).not.toHaveBeenCalled();
		expect(upsertGoogleSheetTables).not.toHaveBeenCalled();
	});

	it("보고서를 읽고 실행 키와 함께 멱등 적재한다", async () => {
		readFile
			.mockResolvedValueOnce(JSON.stringify({ generatedAt: "2026-09-22T00:00:00Z" }))
			.mockResolvedValueOnce(JSON.stringify({ status: "passed" }))
			.mockResolvedValueOnce(JSON.stringify({ status: "good", delivered: true }));
		const result = await persistSeoReportsToSheets({
			spreadsheetId: "sheet-id",
			serviceAccountJson: JSON.stringify({
				client_email: "reporter@example.test",
				private_key: "private-key",
			}),
			githubRunId: "123",
			githubRunAttempt: "2",
			commitSha: "abc",
			runUrl: "https://github.test/run/123",
			stepSummaryPath: "/tmp/summary.md",
		});

		expect(createSeoSheetTables).toHaveBeenCalledWith(
			expect.objectContaining({
				githubRunId: "123",
				githubRunAttempt: "2",
				commitSha: "abc",
				aiReport: { status: "good", delivered: true },
			}),
		);
		expect(upsertGoogleSheetTables).toHaveBeenCalledWith(
			expect.objectContaining({ spreadsheetId: "sheet-id" }),
		);
		expect(appendFile).toHaveBeenCalledWith(
			"/tmp/summary.md",
			expect.stringContaining("1건 적재"),
		);
		expect(result).toEqual({ status: "stored", updatedRows: 1 });
	});

	it("서비스 계정 JSON이 잘못되었으면 적재를 실패로 표시한다", async () => {
		readFile.mockResolvedValue("{}");

		await expect(
			persistSeoReportsToSheets({
				spreadsheetId: "sheet-id",
				serviceAccountJson: "{}",
				githubRunId: "123",
			}),
		).rejects.toThrow("GA4_SERVICE_ACCOUNT_JSON 형식");
	});

	it("GSC 보고서가 없어도 SEO 요약은 적재한다", async () => {
		readFile
			.mockResolvedValueOnce(JSON.stringify({ generatedAt: "2026-09-22T00:00:00Z" }))
			.mockRejectedValueOnce(Object.assign(new Error("not found"), { code: "ENOENT" }));

		await persistSeoReportsToSheets({
			spreadsheetId: "sheet-id",
			serviceAccountJson: JSON.stringify({
				client_email: "reporter@example.test",
				private_key: "private-key",
			}),
			githubRunId: "123",
		});

		expect(createSeoSheetTables).toHaveBeenCalledWith(
			expect.objectContaining({ gscReport: null }),
		);
	});
});
