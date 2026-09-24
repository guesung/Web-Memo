import { describe, expect, it } from "vitest";
import {
	compareSeoReports,
	createFirstSeenLedger,
	createSeoIssueKey,
	parseSeoReportJson,
} from "./seo-history.mjs";

const issue = (code: string, field: string, message = code) => ({
	code,
	field,
	message,
	severity: "warning",
});

const page = ({
	url = "https://www.webmemo.xyz/ko/introduce",
	agent = "mobile",
	failure = null,
	status = 200,
	metadata = {},
	issues = [],
}: {
	url?: string;
	agent?: string;
	failure?: string | null;
	status?: number | null;
	metadata?: object | null;
	issues?: object[];
} = {}) => ({ kind: "page", url, agent, failure, status, metadata, issues });

const report = (pages: object[], schemaVersion: string | number = 1) => ({
	schemaVersion,
	pages,
});

describe("createSeoIssueKey", () => {
	it("문구와 심각도가 바뀌어도 같은 안정 키를 만든다", () => {
		const context = {
			kind: "page",
			url: "https://www.webmemo.xyz/ko/introduce",
			agent: "mobile",
		};

		expect(
			createSeoIssueKey({ ...context, issue: issue("meta-missing", "title") }),
		).toBe(
			createSeoIssueKey({
				...context,
				issue: {
					...issue("meta-missing", "title", "바뀌어나는 설명"),
					severity: "error",
				},
			}),
		);
	});
});

describe("compareSeoReports", () => {
	it("신규·지속·해소 이슈를 분류한다", () => {
		const previous = report([
			page({ issues: [issue("persistent", "title"), issue("resolved", "h1")] }),
		]);
		const current = report([
			page({ issues: [issue("persistent", "title"), issue("new", "lang")] }),
		]);

		const result = compareSeoReports({
			currentReport: current,
			previousReport: previous,
		});

		expect(result.baselineStatus).toBe("compatible");
		expect(result.delta.new.map((item) => item.code)).toEqual(["new"]);
		expect(result.delta.persistent.map((item) => item.code)).toEqual([
			"persistent",
		]);
		expect(result.delta.resolved.map((item) => item.code)).toEqual([
			"resolved",
		]);
		expect(result.delta.unobservable).toEqual([]);
	});

	it("요청이 실패하거나 URL이 미관측이면 이전 이슈를 해소로 보지 않는다", () => {
		const missingUrl = "https://www.webmemo.xyz/en/features/memo";
		const previous = report([
			page({ issues: [issue("failed", "canonical")] }),
			page({ url: missingUrl, issues: [issue("missing", "description")] }),
		]);
		const current = report([
			page({ failure: "timeout", status: null, issues: [] }),
		]);

		const result = compareSeoReports({
			currentReport: current,
			previousReport: previous,
		});

		expect(result.delta.resolved).toEqual([]);
		expect(result.delta.unobservable.map((item) => item.code)).toEqual([
			"failed",
			"missing",
		]);
	});

	it("상대 기기 요청이 실패하면 기기 비교 이슈를 해소로 보지 않는다", () => {
		const url = "https://www.webmemo.xyz/ko/introduce";
		const previous = report([
			page({
				url,
				agent: "pc",
				issues: [issue("DEVICE_METADATA_MISMATCH", "title")],
			}),
		]);
		const current = report([
			page({ url, agent: "pc" }),
			page({ url, agent: "mobile", failure: "timeout", status: null }),
		]);

		const result = compareSeoReports({
			currentReport: current,
			previousReport: previous,
		});

		expect(result.delta.resolved).toEqual([]);
		expect(result.delta.unobservable).toHaveLength(1);
	});

	it("HTTP 200이어도 HTML 메타데이터를 파싱하지 못하면 해소로 보지 않는다", () => {
		const previous = report([
			page({ issues: [issue("TITLE_MISSING", "title")] }),
		]);
		const current = report([page({ metadata: null })]);

		const result = compareSeoReports({
			currentReport: current,
			previousReport: previous,
		});

		expect(result.delta.resolved).toEqual([]);
		expect(result.delta.unobservable).toHaveLength(1);
	});

	it("hreflang 상대 페이지를 관측하지 못하면 복귀 링크 이슈를 해소로 보지 않는다", () => {
		const sourceUrl = "https://www.webmemo.xyz/ko/introduce";
		const relatedUrl = "https://www.webmemo.xyz/en/introduce";
		const previous = report([
			page({
				url: sourceUrl,
				issues: [
					{
						...issue("HREFLANG_RETURN_LINK_MISSING", "hreflang.en"),
						relatedUrl,
					},
				],
			}),
		]);
		const current = report([page({ url: sourceUrl })]);

		const result = compareSeoReports({
			currentReport: current,
			previousReport: previous,
		});

		expect(result.delta.resolved).toEqual([]);
		expect(result.delta.unobservable).toHaveLength(1);
	});

	it("중복 비교 상대 페이지를 관측하지 못하면 메타 중복을 해소로 보지 않는다", () => {
		const sourceUrl = "https://www.webmemo.xyz/ko/introduce";
		const relatedUrl = "https://www.webmemo.xyz/ko/features/memo";
		const duplicateIssue = {
			...issue("META_DUPLICATE_ACROSS_PAGES", "title"),
			relatedUrls: [relatedUrl],
		};
		const previous = report([
			page({ url: sourceUrl, issues: [duplicateIssue] }),
		]);
		const current = report([page({ url: sourceUrl })]);

		const result = compareSeoReports({
			currentReport: current,
			previousReport: previous,
		});

		expect(result.delta.resolved).toEqual([]);
		expect(result.delta.unobservable).toHaveLength(1);
	});

	it("중복 비교의 두 페이지가 모두 정상이면 실제 해소로 판정한다", () => {
		const sourceUrl = "https://www.webmemo.xyz/ko/introduce";
		const relatedUrl = "https://www.webmemo.xyz/ko/features/memo";
		const previous = report([
			page({
				url: sourceUrl,
				issues: [
					{
						...issue("META_DUPLICATE_ACROSS_PAGES", "title"),
						relatedUrls: [relatedUrl],
					},
				],
			}),
		]);
		const current = report([
			page({ url: sourceUrl }),
			page({ url: relatedUrl }),
		]);

		const result = compareSeoReports({
			currentReport: current,
			previousReport: previous,
		});

		expect(result.delta.resolved).toHaveLength(1);
		expect(result.delta.unobservable).toEqual([]);
	});

	it("첫 실행에서는 기준선을 missing으로 표시하고 전부 new로 만들지 않는다", () => {
		const result = compareSeoReports({
			currentReport: report([page({ issues: [issue("new", "title")] })]),
			previousReport: null,
		});

		expect(result).toEqual({
			baselineStatus: "missing",
			delta: { new: [], persistent: [], resolved: [], unobservable: [] },
		});
	});

	it("스키마가 다르면 incompatible로 표시하고 비교하지 않는다", () => {
		const result = compareSeoReports({
			currentReport: report([page()], 2),
			previousReport: report([page({ issues: [issue("old", "title")] })], 1),
		});

		expect(result.baselineStatus).toBe("incompatible");
		expect(result.delta.new).toEqual([]);
	});
});

describe("createFirstSeenLedger", () => {
	const INTRODUCE = "https://www.webmemo.xyz/ko/introduce";
	const keyOf = (code: string, field: string, url = INTRODUCE) =>
		createSeoIssueKey({ kind: "page", url, agent: "mobile", issue: issue(code, field) });
	const dated = (generatedAt: string, pages: object[], firstSeen?: object) => ({
		...report(pages),
		generatedAt,
		...(firstSeen ? { history: { firstSeen } } : {}),
	});

	it("직전 신규 이슈가 지속되면 원장의 최초 발견 시각을 그대로 이어받는다", () => {
		const firstSeen = {
			[keyOf("title", "title")]: { firstSeenAt: "2026-09-01T00:17:00Z", exact: true },
		};
		const ledger = createFirstSeenLedger({
			previousReport: dated("2026-09-22T00:17:00Z", [page({ issues: [issue("title", "title")] })], firstSeen),
			currentReport: dated("2026-09-23T00:17:00Z", [page({ issues: [issue("title", "title")] })]),
		});

		expect(ledger[keyOf("title", "title")]).toEqual({
			firstSeenAt: "2026-09-01T00:17:00Z",
			exact: true,
		});
	});

	it("직전 보고서에 원장이 없으면 직전 실행 시각을 부정확 표시와 함께 쓴다", () => {
		const ledger = createFirstSeenLedger({
			previousReport: dated("2026-09-22T00:17:00Z", [page({ issues: [issue("title", "title")] })]),
			currentReport: dated("2026-09-23T00:17:00Z", [page({ issues: [issue("title", "title")] })]),
		});

		expect(ledger[keyOf("title", "title")]).toEqual({
			firstSeenAt: "2026-09-22T00:17:00Z",
			exact: false,
		});
	});

	it("직전 실행이 관측한 페이지에 새로 생긴 이슈만 정확한 신규로 본다", () => {
		const otherUrl = "https://www.webmemo.xyz/en/introduce";
		const ledger = createFirstSeenLedger({
			previousReport: dated("2026-09-22T00:17:00Z", [
				page(),
				page({ url: otherUrl, failure: "timeout", status: null, metadata: null }),
			]),
			currentReport: dated("2026-09-23T00:17:00Z", [
				page({ issues: [issue("lang", "lang")] }),
				page({ url: otherUrl, issues: [issue("lang", "lang")] }),
			]),
		});

		expect(ledger[keyOf("lang", "lang")]).toEqual({
			firstSeenAt: "2026-09-23T00:17:00Z",
			exact: true,
		});
		expect(ledger[keyOf("lang", "lang", otherUrl)].exact).toBe(false);
	});

	it("요청이 실패한 날에도 원장을 남겨 다음 실행에서 경과 기간이 초기화되지 않는다", () => {
		const key = keyOf("title", "title");
		const original = { firstSeenAt: "2026-09-01T00:17:00Z", exact: true };
		const failedDay = createFirstSeenLedger({
			previousReport: dated("2026-09-21T00:17:00Z", [page({ issues: [issue("title", "title")] })], {
				[key]: original,
			}),
			currentReport: dated("2026-09-22T00:17:00Z", [
				page({ failure: "timeout", status: null, metadata: null }),
			]),
		});
		const nextDay = createFirstSeenLedger({
			previousReport: dated(
				"2026-09-22T00:17:00Z",
				[page({ failure: "timeout", status: null, metadata: null })],
				failedDay,
			),
			currentReport: dated("2026-09-23T00:17:00Z", [page({ issues: [issue("title", "title")] })]),
		});

		expect(failedDay[key]).toEqual(original);
		expect(nextDay[key]).toEqual(original);
	});

	it("관측한 페이지에서 사라진 이슈는 원장에서 지운다", () => {
		const key = keyOf("title", "title");
		const ledger = createFirstSeenLedger({
			previousReport: dated("2026-09-22T00:17:00Z", [page({ issues: [issue("title", "title")] })], {
				[key]: { firstSeenAt: "2026-09-01T00:17:00Z", exact: true },
			}),
			currentReport: dated("2026-09-23T00:17:00Z", [page()]),
		});

		expect(ledger).toEqual({});
	});

	it("이전 보고서가 없으면 모든 이슈를 이번 실행 시각의 부정확 값으로 둔다", () => {
		const ledger = createFirstSeenLedger({
			previousReport: null,
			currentReport: dated("2026-09-23T00:17:00Z", [page({ issues: [issue("title", "title")] })]),
		});

		expect(ledger[keyOf("title", "title")]).toEqual({
			firstSeenAt: "2026-09-23T00:17:00Z",
			exact: false,
		});
	});
});

describe("parseSeoReportJson", () => {
	it("손상된 JSON을 incompatible로 판정한다", () => {
		expect(parseSeoReportJson("{broken")).toEqual({
			baselineStatus: "incompatible",
			report: null,
		});
	});
});
