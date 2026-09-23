// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it, vi } from "vitest";
import {
	collectGscReport,
	compareGscInspections,
	GSC_READONLY_SCOPE,
	GSC_SITE_URL,
	resolveGscMonths,
	resolveGscWeeks,
} from "./seo-gsc.mjs";

const PAGE_URL = "https://www.webmemo.xyz/ko/introduce";
const inspectionResponse = () =>
	new Response(
		JSON.stringify({
			inspectionResult: {
				indexStatusResult: {
					verdict: "PASS",
					coverageState: "Submitted and indexed",
					indexingState: "INDEXING_ALLOWED",
					robotsTxtState: "ALLOWED",
					pageFetchState: "SUCCESSFUL",
					lastCrawlTime: "2026-09-20T00:00:00Z",
					googleCanonical: PAGE_URL,
					userCanonical: PAGE_URL,
					referringUrls: ["민감하지 않아도 저장 대상이 아닌 필드"],
				},
			},
		}),
		{ status: 200 },
	);

describe("GSC 기간 계산", () => {
	it("태평양 시간의 오늘과 확정 지연을 기준으로 연속된 두 7일을 만든다", () => {
		expect(resolveGscWeeks(new Date("2026-09-22T05:00:00Z"))).toEqual({
			start: "2026-09-12",
			end: "2026-09-18",
			previousStart: "2026-09-05",
			previousEnd: "2026-09-11",
		});
	});

	it("확정 지연을 뺀 날짜 기준으로 끝난 달 3개를 오래된 순으로 만든다", () => {
		expect(resolveGscMonths(new Date("2026-09-22T05:00:00Z"))).toEqual([
			{ month: "2026-06", startDate: "2026-06-01", endDate: "2026-06-30" },
			{ month: "2026-07", startDate: "2026-07-01", endDate: "2026-07-31" },
			{ month: "2026-08", startDate: "2026-08-01", endDate: "2026-08-31" },
		]);
	});

	it("월 초에는 아직 확정되지 않은 직전 달을 빼고 연도를 넘긴다", () => {
		expect(
			resolveGscMonths(new Date("2026-02-02T20:00:00Z")).map(
				(month) => month.month,
			),
		).toEqual(["2025-10", "2025-11", "2025-12"]);
	});
});

describe("GSC 리포트 수집", () => {
	it("Secret이 없으면 인증이나 네트워크 요청 없이 건너뛴다", async () => {
		const tokenExchanger = vi.fn();
		const fetcher = vi.fn();

		const report = await collectGscReport({
			serviceAccountJson: "",
			urls: [PAGE_URL],
			tokenExchanger,
			fetcher,
		});

		expect(report.status).toBe("skipped");
		expect(tokenExchanger).not.toHaveBeenCalled();
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("조회 전용 scope로 한 번 인증하고 중복 URL은 한 번만 검사한다", async () => {
		const tokenExchanger = vi.fn(async () => "access-token");
		const fetcher = vi.fn(async () => inspectionResponse());

		const report = await collectGscReport({
			serviceAccountJson: JSON.stringify({ client_email: "test", private_key: "test" }),
			urls: [PAGE_URL, PAGE_URL],
			tokenExchanger,
			fetcher,
		});

		expect(tokenExchanger).toHaveBeenCalledWith({
			serviceAccount: { client_email: "test", private_key: "test" },
			scope: GSC_READONLY_SCOPE,
		});
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
			inspectionUrl: PAGE_URL,
			siteUrl: GSC_SITE_URL,
		});
		expect(report.inspections).toEqual([
			expect.not.objectContaining({ referringUrls: expect.anything() }),
		]);
		expect(report.inspections[0]).toMatchObject({ verdict: "PASS", url: PAGE_URL });
	});

	it("429를 제한 횟수 안에서 재시도하고 원문 오류를 저장하지 않는다", async () => {
		const sleep = vi.fn();
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(new Response("token and private details", { status: 429 }))
			.mockResolvedValueOnce(inspectionResponse());

		const report = await collectGscReport({
			serviceAccountJson: "{}",
			urls: [PAGE_URL],
			tokenExchanger: async () => "token",
			fetcher,
			sleep,
		});

		expect(report.status).toBe("passed");
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledWith(250);
		expect(JSON.stringify(report)).not.toContain("private details");
	});

	it("403은 안전한 실패 코드만 기록한다", async () => {
		const report = await collectGscReport({
			serviceAccountJson: "{}",
			urls: [PAGE_URL],
			tokenExchanger: async () => "secret-token",
			fetcher: async () => new Response("secret-token raw API body", { status: 403 }),
		});

		expect(report.status).toBe("failed");
		expect(report.failures).toEqual([
			expect.objectContaining({ code: "permission_denied", url: PAGE_URL }),
		]);
		expect(JSON.stringify(report)).not.toContain("secret-token");
	});

	it("주간 모드는 총계·월간 합계와 두 주의 query·page 행을 final 데이터로 조회한다", async () => {
		const fetcher = vi.fn(async (url, options) => {
			if (url.includes("urlInspection")) {
				return inspectionResponse();
			}
			const body = JSON.parse(options.body);
			const isPrevious = body.startDate === "2026-09-05";
			const rows = {
				query: isPrevious
					? [{ keys: ["web memo"], clicks: 1, impressions: 10, ctr: 0.1, position: 6 }]
					: [
							{ keys: ["web memo"], clicks: 3, impressions: 20, ctr: 0.15, position: 4 },
							{ keys: ["new query"], clicks: 1, impressions: 5, ctr: 0.2, position: 8 },
						],
				page: [{ keys: [PAGE_URL], clicks: 2, impressions: 9, ctr: 0.2, position: 3 }],
			}[body.dimensions?.[0]] ?? [
				{ keys: [], clicks: 7, impressions: 70, ctr: 0.1, position: 5 },
			];

			return new Response(JSON.stringify({ rows }), { status: 200 });
		});

		const report = await collectGscReport({
			serviceAccountJson: "{}",
			urls: [PAGE_URL],
			weekly: true,
			now: new Date("2026-09-22T05:00:00Z"),
			tokenExchanger: async () => "token",
			fetcher,
		});
		const analyticsBodies = fetcher.mock.calls
			.filter(([url]) => url.includes("searchAnalytics"))
			.map(([, options]) => JSON.parse(options.body));

		expect(analyticsBodies).toHaveLength(9);
		expect(analyticsBodies.every((body) => body.dataState === "final")).toBe(true);
		expect(analyticsBodies.filter((body) => !body.dimensions)).toHaveLength(5);
		expect(
			analyticsBodies
				.filter((body) => body.dimensions)
				.map((body) => [body.dimensions[0], body.startDate, body.rowLimit]),
		).toEqual([
			["query", "2026-09-12", 50],
			["query", "2026-09-05", 250],
			["page", "2026-09-12", 50],
			["page", "2026-09-05", 250],
		]);
		expect(report.weekly.topQueries).toEqual([
			expect.objectContaining({
				keys: ["web memo"],
				clicks: 3,
				previous: { clicks: 1, impressions: 10, ctr: 0.1, position: 6 },
			}),
			expect.objectContaining({ keys: ["new query"], previous: null }),
		]);
		expect(report.weekly.monthly).toEqual([
			expect.objectContaining({ month: "2026-06", clicks: 7, impressions: 70 }),
			expect.objectContaining({ month: "2026-07" }),
			expect.objectContaining({ month: "2026-08" }),
		]);
	});

	it("월간 합계 조회만 실패하면 주간 성과는 남기고 실패를 기록한다", async () => {
		const fetcher = vi.fn(async (url, options) => {
			if (url.includes("urlInspection")) {
				return inspectionResponse();
			}
			const body = JSON.parse(options.body);
			if (body.startDate.endsWith("-01") && !body.dimensions) {
				return new Response("server error", { status: 500 });
			}

			return new Response(
				JSON.stringify({ rows: [{ keys: [], clicks: 1, impressions: 2, ctr: 0.5, position: 3 }] }),
				{ status: 200 },
			);
		});

		const report = await collectGscReport({
			serviceAccountJson: "{}",
			urls: [PAGE_URL],
			weekly: true,
			now: new Date("2026-09-22T05:00:00Z"),
			tokenExchanger: async () => "token",
			fetcher,
			sleep: async () => undefined,
		});

		expect(report.weekly.current.clicks).toBe(1);
		expect(report.weekly.monthly).toBeNull();
		expect(report.failures).toEqual([
			expect.objectContaining({ scope: "monthly", code: "service_unavailable" }),
		]);
	});

	it("잘못된 인증 JSON은 원문 없이 구조화된 실패로 끝난다", async () => {
		const report = await collectGscReport({
			serviceAccountJson: "{private-key",
			urls: [PAGE_URL],
		});

		expect(report).toMatchObject({
			status: "failed",
			failures: [{ code: "invalid_credentials" }],
		});
		expect(JSON.stringify(report)).not.toContain("private-key");
	});
});

describe("GSC 색인 변화 비교", () => {
	const inspection = (url, verdict) => ({ url, verdict, coverageState: verdict });

	it("색인됐던 URL이 빠지면 이탈, 돌아오면 복귀로 분류한다", () => {
		const changes = compareGscInspections({
			previousReport: {
				inspections: [inspection("/a", "PASS"), inspection("/b", "NEUTRAL")],
			},
			currentReport: {
				inspections: [inspection("/a", "NEUTRAL"), inspection("/b", "PASS")],
			},
		});

		expect(changes.baselineStatus).toBe("compatible");
		expect(changes.dropped).toEqual([
			expect.objectContaining({ url: "/a", previousVerdict: "PASS", verdict: "NEUTRAL" }),
		]);
		expect(changes.recovered).toEqual([
			expect.objectContaining({ url: "/b", previousVerdict: "NEUTRAL", verdict: "PASS" }),
		]);
	});

	it("PARTIAL은 색인된 상태로 보고, 판정이 없는 URL은 비교하지 않는다", () => {
		const changes = compareGscInspections({
			previousReport: {
				inspections: [inspection("/a", "PASS"), inspection("/b", "PASS")],
			},
			currentReport: {
				inspections: [inspection("/a", "PARTIAL"), inspection("/b", null)],
			},
		});

		expect(changes.dropped).toEqual([]);
		expect(changes.recovered).toEqual([]);
	});

	it("이번 조회 결과가 없으면 이탈 0건이 아니라 unavailable로 표시한다", () => {
		expect(
			compareGscInspections({
				previousReport: { inspections: [inspection("/a", "PASS")] },
				currentReport: { status: "failed", inspections: [] },
			}).baselineStatus,
		).toBe("unavailable");
	});

	it("이번에 조회하지 못한 URL은 이탈로 보지 않는다", () => {
		const changes = compareGscInspections({
			previousReport: { inspections: [inspection("/a", "PASS")] },
			currentReport: { inspections: [inspection("/b", "NEUTRAL")] },
		});

		expect(changes.dropped).toEqual([]);
	});

	it("이전 리포트가 없으면 missing으로 표시한다", () => {
		expect(
			compareGscInspections({
				previousReport: null,
				currentReport: { inspections: [inspection("/a", "PASS")] },
			}),
		).toEqual({ baselineStatus: "missing", dropped: [], recovered: [] });
	});
});
