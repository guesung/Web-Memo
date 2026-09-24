import { describe, expect, it } from "vitest";
import { createSeoSheetTables } from "./seo-sheets.mjs";

const createReport = () => ({
	generatedAt: "2026-09-22T00:17:00Z",
	errors: 1,
	warnings: 1,
	pages: [
		{
			kind: "page",
			url: "https://example.com/a",
			agent: "pc",
			status: 200,
			metadata: {},
			issues: [{ severity: "warning" }],
		},
		{
			kind: "page",
			url: "https://example.com/a",
			agent: "mobile",
			status: 200,
			metadata: {},
			issues: [],
		},
		{
			kind: "page",
			url: "https://example.com/b",
			agent: "pc",
			status: null,
			failure: "timeout",
			issues: [{ severity: "error" }],
		},
		{
			kind: "robots",
			url: "https://example.com/robots.txt",
			agent: "pc",
			status: 200,
			issues: [],
		},
	],
	history: {
		baselineStatus: "compatible",
		delta: {
			new: [
				{
					key: "issue-a",
					url: "https://example.com/a",
					code: "TITLE",
					severity: "warning",
				},
			],
			persistent: [{ key: "persistent" }],
			resolved: [{ key: "resolved" }],
			unobservable: [{ key: "unobservable" }],
		},
	},
});

const metadata = {
	githubRunId: "123",
	githubRunAttempt: "1",
	commitSha: "sha",
	runUrl: "https://github.com/run/123",
};
const record = (table) =>
	Object.fromEntries(
		table.legacyHeaders.map((header, index) => [header, table.rows[0][index]]),
	);

describe("createSeoSheetTables", () => {
	it("여섯 탭의 모든 표시명을 한글로 제공하고 기존 영문 컬럼 순서를 유지한다", () => {
		const tables = createSeoSheetTables({
			...metadata,
			seoReport: createReport(),
		});
		expect(tables.map((table) => table.legacyHeaders.join(" "))).toEqual([
			"key generatedAt githubRunId githubRunAttempt commitSha runUrl status requestCount pageCount observedPageCount errorCount warningCount errorPageCount warningPageCount healthyPageCount errorPageRatio warningPageRatio healthyPageRatio baselineStatus newCount persistentCount resolvedCount unobservableCount gscStatus gscInspectionCount gscFailureCount currentClicks currentImpressions currentCtr currentPosition previousClicks previousImpressions previousCtr previousPosition clicksChangeRatio impressionsChangeRatio ctrChangeAmount positionChangeAmount",
			"key runKey generatedAt githubRunId githubRunAttempt state issueKey kind url agent code field severity message",
			"key runKey generatedAt githubRunId githubRunAttempt inspectedAt siteUrl url verdict coverageState indexingState robotsTxtState pageFetchState lastCrawlTime googleCanonical userCanonical",
			"key runKey generatedAt githubRunId githubRunAttempt siteUrl period startDate endDate dimension value clicks impressions ctr position",
			"key generatedAt githubRunId githubRunAttempt runUrl mode status headline p0Count p1Count p2Count p3Count droppedFindingCount delivered",
			"key date commitSha prUrl summary affectedUrls notes",
		]);
		for (const table of tables) {
			expect(table.headers).toHaveLength(table.legacyHeaders.length);
			expect(new Set(table.headers).size).toBe(table.headers.length);
			for (const header of table.headers) {
				expect(header).toMatch(/[가-힣]/);
			}
		}
	});
	it("AI 리포트가 있으면 실행당 한 행을 남기고 없으면 행을 만들지 않는다", () => {
		const aiReport = {
			mode: "weekly",
			status: "warning",
			headline: "요약",
			counts: { P0: 0, P1: 1, P2: 2, P3: 0 },
			droppedFindingCount: 1,
			delivered: true,
		};
		const withAi = createSeoSheetTables({ ...metadata, seoReport: createReport(), aiReport });
		const withoutAi = createSeoSheetTables({ ...metadata, seoReport: createReport() });
		const aiTable = withAi.find((table) => table.title === "SEO AI Reports");

		expect(record(aiTable)).toEqual({
			key: "123:1",
			generatedAt: "2026-09-22T00:17:00Z",
			githubRunId: "123",
			githubRunAttempt: "1",
			runUrl: "https://github.com/run/123",
			mode: "weekly",
			status: "warning",
			headline: "요약",
			p0Count: 0,
			p1Count: 1,
			p2Count: 2,
			p3Count: 0,
			droppedFindingCount: 1,
			delivered: true,
		});
		expect(withoutAi.find((table) => table.title === "SEO AI Reports").rows).toEqual([]);
	});
	it("고유 URL의 관측 및 오류 비율과 변화 이벤트만 생성한다", () => {
		const tables = createSeoSheetTables({
			...metadata,
			seoReport: createReport(),
		});
		expect(record(tables[0])).toMatchObject({
			key: "123:1",
			requestCount: 4,
			pageCount: 2,
			observedPageCount: 1,
			errorPageRatio: 0.5,
			warningPageRatio: 0.5,
			healthyPageRatio: 0,
			persistentCount: 1,
			gscStatus: "missing",
		});
		expect(tables[1].rows.map((row) => row[5])).toEqual([
			"new",
			"resolved",
			"unobservable",
		]);
		for (const table of tables) {
			for (const row of table.rows) {
				expect(row).toHaveLength(table.headers.length);
			}
		}
	});
	it("최초 기준선은 이벤트를 만들지 않고 빈 분모는 0%로 오인하지 않는다", () => {
		const seoReport = createReport();
		seoReport.history.baselineStatus = "missing";
		seoReport.pages = [];
		const tables = createSeoSheetTables({ ...metadata, seoReport });
		expect(tables[1].rows).toEqual([]);
		expect(record(tables[0])).toMatchObject({
			baselineStatus: "missing",
			pageCount: 0,
			observedPageCount: 0,
			errorPageRatio: "",
			healthyPageRatio: "",
		});
	});
	it("GSC skipped 상태는 실행에 남기고 GSC 행은 생성하지 않는다", () => {
		const tables = createSeoSheetTables({
			...metadata,
			seoReport: createReport(),
			gscReport: { status: "skipped", inspections: [{ url: "ignored" }] },
		});
		expect(record(tables[0]).gscStatus).toBe("skipped");
		expect(tables[2].rows).toEqual([]);
		expect(tables[3].rows).toEqual([]);
		expect(record(tables[0])).toMatchObject({
			currentClicks: "",
			previousClicks: "",
			clicksChangeRatio: "",
			positionChangeAmount: "",
		});
	});
	it("색인 스냅샷과 기간이 구분되는 주간 전체 및 상위 지표를 저장한다", () => {
		const metric = {
			keys: [],
			clicks: 3,
			impressions: 10,
			ctr: 0.3,
			position: 4,
		};
		const tables = createSeoSheetTables({
			...metadata,
			seoReport: createReport(),
			gscReport: {
				status: "passed",
				generatedAt: "2026-09-22",
				siteUrl: "https://example.com/",
				inspections: [
					{
						url: "https://example.com/a",
						verdict: "PASS",
						googleCanonical: "https://example.com/a",
					},
				],
				weekly: {
					week: {
						start: "2026-09-12",
						end: "2026-09-18",
						previousStart: "2026-09-05",
						previousEnd: "2026-09-11",
					},
					current: metric,
					previous: { ...metric, clicks: 2 },
					topQueries: [{ ...metric, keys: ["=SUM(A1)"] }],
					topPages: [{ ...metric, keys: ["https://example.com/a"] }],
				},
			},
		});
		expect(record(tables[2])).toMatchObject({
			verdict: "PASS",
			googleCanonical: "https://example.com/a",
		});
		expect(tables[3].rows.map((row) => row.slice(6, 12))).toEqual([
			["current", "2026-09-12", "2026-09-18", "total", "", 3],
			["previous", "2026-09-05", "2026-09-11", "total", "", 2],
			["current", "2026-09-12", "2026-09-18", "query", "=SUM(A1)", 3],
			[
				"current",
				"2026-09-12",
				"2026-09-18",
				"page",
				"https://example.com/a",
				3,
			],
		]);
		expect(new Set(tables[3].rows.map((row) => row[0])).size).toBe(4);
		expect(record(tables[0])).toMatchObject({
			currentClicks: 3,
			previousClicks: 2,
			currentImpressions: 10,
			previousImpressions: 10,
			currentCtr: 0.3,
			previousCtr: 0.3,
			currentPosition: 4,
			previousPosition: 4,
			clicksChangeRatio: 0.5,
			impressionsChangeRatio: 0,
			ctrChangeAmount: 0,
			positionChangeAmount: 0,
		});
	});
	it("수동 변경 기록 탭의 헤더만 만들고 자동 행을 추가하지 않는다", () => {
		const tables = createSeoSheetTables({
			...metadata,
			seoReport: createReport(),
		});
		expect(tables.find((table) => table.title === "SEO Changes")).toEqual({
			title: "SEO Changes",
			headers: [
				"기록 키",
				"변경일",
				"커밋 SHA",
				"PR 링크",
				"변경 요약",
				"영향받는 URL",
				"비고",
			],
			legacyHeaders: [
				"key",
				"date",
				"commitSha",
				"prUrl",
				"summary",
				"affectedUrls",
				"notes",
			],
			rows: [],
		});
	});
	it("직전 기간 분모가 0이면 변화율을 비워 두고 CTR과 순위는 차이를 남긴다", () => {
		const tables = createSeoSheetTables({
			...metadata,
			seoReport: createReport(),
			gscReport: {
				status: "passed",
				weekly: {
					week: {
						start: "2026-09-12",
						end: "2026-09-18",
						previousStart: "2026-09-05",
						previousEnd: "2026-09-11",
					},
					current: { clicks: 5, impressions: 10, ctr: 0.5, position: 3 },
					previous: { clicks: 0, impressions: 0, ctr: 0, position: 5 },
				},
			},
		});
		expect(record(tables[0])).toMatchObject({
			clicksChangeRatio: "",
			impressionsChangeRatio: "",
			ctrChangeAmount: 0.5,
			positionChangeAmount: -2,
		});
	});
	it("동일 attempt는 동일 키, 다른 attempt는 다른 키를 생성한다", () => {
		const input = { ...metadata, seoReport: createReport() };
		const tables = createSeoSheetTables(input);
		expect(createSeoSheetTables(input)).toEqual(tables);
		expect(
			createSeoSheetTables({ ...input, githubRunAttempt: "2" })[1].rows[0][0],
		).not.toBe(tables[1].rows[0][0]);
	});
});
