// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it, vi } from "vitest";
import {
	collectGscReport,
	GSC_READONLY_SCOPE,
	GSC_SITE_URL,
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

	it("주간 모드는 총계 두 번과 query·page 상위 행을 final 데이터로 조회한다", async () => {
		const fetcher = vi.fn(async (url, options) => {
			if (url.includes("urlInspection")) {
				return inspectionResponse();
			}

			return new Response(
				JSON.stringify({
					rows: [{ keys: ["value"], clicks: 3, impressions: 20, ctr: 0.15, position: 4 }],
				}),
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
		});
		const analyticsBodies = fetcher.mock.calls
			.filter(([url]) => url.includes("searchAnalytics"))
			.map(([, options]) => JSON.parse(options.body));

		expect(analyticsBodies).toHaveLength(4);
		expect(analyticsBodies.every((body) => body.dataState === "final")).toBe(true);
		expect(analyticsBodies.filter((body) => !body.dimensions)).toHaveLength(2);
		expect(analyticsBodies.map((body) => body.dimensions?.[0]).filter(Boolean)).toEqual([
			"query",
			"page",
		]);
		expect(report.weekly.topQueries[0].clicks).toBe(3);
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
