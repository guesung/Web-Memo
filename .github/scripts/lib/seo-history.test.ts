import { describe, expect, it } from "vitest";
import {
	compareSeoReports,
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

describe("parseSeoReportJson", () => {
	it("손상된 JSON을 incompatible로 판정한다", () => {
		expect(parseSeoReportJson("{broken")).toEqual({
			baselineStatus: "incompatible",
			report: null,
		});
	});
});
