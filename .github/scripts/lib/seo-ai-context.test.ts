// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";
import { createSeoAiContext, parseGitLog } from "./seo-ai-context.mjs";

const INTRODUCE = "https://www.webmemo.xyz/ko/introduce";
const MEMO = "https://www.webmemo.xyz/ko/features/memo";
const keyOf = (url, agent, code, field) =>
	["page", url, agent, code, field].join("\u001f");

const createSeoReport = () => ({
	schemaVersion: 2,
	errors: 0,
	warnings: 3,
	pages: [
		{
			kind: "page",
			url: INTRODUCE,
			agent: "pc",
			issues: [
				{ severity: "warning", code: "OG_FIELD_MISSING", field: "og.url", message: "og:url 누락" },
			],
		},
		{
			kind: "page",
			url: MEMO,
			agent: "pc",
			issues: [
				{ severity: "warning", code: "OG_FIELD_MISSING", field: "og.url", message: "og:url 누락" },
				{ severity: "warning", code: "H1_COUNT_INVALID", field: "h1", message: "h1 개수: 0" },
			],
		},
	],
	history: {
		baselineStatus: "compatible",
		delta: {
			new: [{ key: keyOf(MEMO, "pc", "H1_COUNT_INVALID", "h1") }],
			persistent: [],
			resolved: [{ code: "CANONICAL_MISMATCH", field: "canonical", url: INTRODUCE }],
			unobservable: [],
		},
		firstSeen: {
			[keyOf(INTRODUCE, "pc", "OG_FIELD_MISSING", "og.url")]: {
				firstSeenAt: "2026-09-01T00:17:00.000Z",
				exact: true,
			},
			[keyOf(MEMO, "pc", "OG_FIELD_MISSING", "og.url")]: {
				firstSeenAt: "2026-09-10T00:17:00.000Z",
				exact: false,
			},
			[keyOf(MEMO, "pc", "H1_COUNT_INVALID", "h1")]: {
				firstSeenAt: "2026-09-23T00:17:00.000Z",
				exact: true,
			},
		},
	},
});

describe("createSeoAiContext", () => {
	const now = new Date("2026-09-23T00:30:00.000Z");

	it("같은 코드·필드의 이슈를 묶고 신규·지속과 가장 이른 발견일을 계산한다", () => {
		const context = createSeoAiContext({ seoReport: createSeoReport(), now });
		const ogGroup = context.seo.issueGroups.find((group) => group.id === "seo:OG_FIELD_MISSING:og.url");
		const h1Group = context.seo.issueGroups.find((group) => group.id === "seo:H1_COUNT_INVALID:h1");

		expect(ogGroup).toMatchObject({
			affectedCount: 2,
			statusCounts: { new: 0, persistent: 2, unknown: 0 },
			earliestFirstSeenAt: "2026-09-01T00:17:00.000Z",
			firstSeenExact: false,
			ageDays: 22,
		});
		expect(h1Group.statusCounts.new).toBe(1);
		expect(context.seo.resolvedGroups).toEqual([
			expect.objectContaining({ id: "seo-resolved:CANONICAL_MISMATCH:canonical", urls: [INTRODUCE] }),
		]);
	});

	it("기준선이 없으면 신규·지속을 단정하지 않고 unknown으로 센다", () => {
		const seoReport = createSeoReport();
		seoReport.history.baselineStatus = "missing";

		const context = createSeoAiContext({ seoReport, now });

		expect(context.seo.issueGroups.every((group) => group.statusCounts.unknown === group.affectedCount)).toBe(true);
	});

	it("GSC 주간 성과의 증감을 미리 계산하고 근거 id를 모두 모은다", () => {
		const context = createSeoAiContext({
			seoReport: createSeoReport(),
			gscReport: {
				status: "passed",
				inspections: [
					{ url: INTRODUCE, verdict: "PASS" },
					{ url: MEMO, verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed" },
				],
				indexChanges: {
					baselineStatus: "compatible",
					dropped: [{ url: MEMO, previousVerdict: "PASS", verdict: "NEUTRAL" }],
					recovered: [],
				},
				weekly: {
					week: { start: "2026-09-12", end: "2026-09-18" },
					current: { clicks: 12, impressions: 200, ctr: 0.06, position: 8 },
					previous: { clicks: 10, impressions: 250, ctr: 0.04, position: 9 },
					topQueries: [
						{
							keys: ["웹 메모"],
							clicks: 5,
							impressions: 50,
							ctr: 0.1,
							position: 3,
							previous: { clicks: 4, impressions: 40, ctr: 0.1, position: 4 },
						},
					],
					topPages: [],
					monthly: [{ month: "2026-08", clicks: 40 }],
				},
			},
			now,
		});

		expect(context.mode).toBe("weekly");
		expect(context.gsc.weekly.totals.clicks.changeRatio).toBeCloseTo(0.2);
		expect(context.gsc.weekly.totals.impressions.changeRatio).toBeCloseTo(-0.2);
		expect(context.gsc.weekly.topQueries[0]).toMatchObject({
			query: "웹 메모",
			impressionsChangeRatio: 0.25,
			positionImprovement: 1,
		});
		expect(context.evidenceIds).toEqual(
			expect.arrayContaining([
				"seo:OG_FIELD_MISSING:og.url",
				"seo-resolved:CANONICAL_MISMATCH:canonical",
				`gsc:not-indexed:${MEMO}`,
				`gsc:index-dropped:${MEMO}`,
				"gsc:weekly",
				"gsc:monthly",
			]),
		);
		expect(context.evidenceIds).not.toContain(`gsc:not-indexed:${INTRODUCE}`);
	});

	it("GSC 보고서가 없으면 일일 리포트로 표시한다", () => {
		const context = createSeoAiContext({ seoReport: createSeoReport(), now });

		expect(context.mode).toBe("daily");
		expect(context.gsc.status).toBe("missing");
		expect(context.reportDate).toBe("2026-09-23");
	});
});

describe("parseGitLog", () => {
	it("커밋 헤더와 파일 목록을 읽는다", () => {
		const output = [
			"abc1234\u001f2026-09-23T13:56:14+09:00\u001ffeat: 메타 추가",
			"apps/web/src/app/layout.tsx",
			"apps/web/src/app/page.tsx",
			"",
			"def5678\u001f2026-09-22T10:00:00+09:00\u001ffix: sitemap",
			"apps/web/src/app/sitemap.ts",
		].join("\n");

		expect(parseGitLog(output)).toEqual([
			{
				sha: "abc1234",
				date: "2026-09-23T13:56:14+09:00",
				subject: "feat: 메타 추가",
				files: ["apps/web/src/app/layout.tsx", "apps/web/src/app/page.tsx"],
			},
			{
				sha: "def5678",
				date: "2026-09-22T10:00:00+09:00",
				subject: "fix: sitemap",
				files: ["apps/web/src/app/sitemap.ts"],
			},
		]);
	});

	it("빈 출력은 빈 목록이다", () => {
		expect(parseGitLog("")).toEqual([]);
	});
});
