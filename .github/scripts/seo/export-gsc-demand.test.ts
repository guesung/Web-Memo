// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	collectGscDemand,
	createDemandMarkdown,
	escapeTableCell,
	GSC_ROW_LIMIT,
	resolveDemandPeriod,
	runGscDemandExport,
	summarizeOpportunities,
	summarizePublicPages,
	summarizeSitemaps,
} from "./export-gsc-demand.mjs";
import { GSC_SITE_URL } from "./seo-gsc.mjs";

const NOW = new Date("2026-10-11T05:00:00Z");
const json = (body, status = 200) =>
	new Response(JSON.stringify(body), { status });
const apiRow = ({ query, page, clicks = 0, impressions = 10, position = 10 }) => ({
	keys: [query, page],
	clicks,
	impressions,
	ctr: impressions ? clicks / impressions : 0,
	position,
});
const row = ({ query = "q", page = "https://www.webmemo.xyz/ko/introduce", clicks = 0, impressions = 10, position = 10 }) => ({
	query,
	page,
	clicks,
	impressions,
	ctr: 0,
	position,
});
const tokenExchanger = vi.fn(async () => "token");
const sleep = vi.fn(async () => {});

/** searchAnalytics 응답을 차례로 돌려주고, sitemaps GET에는 sitemapBody를 돌려주는 fetcher 목입니다. */
const createFetcher = ({ analytics = [{ rows: [] }], sitemapBody = {} } = {}) => {
	const queue = [...analytics];
	return vi.fn(async (url, init) => {
		if (url.endsWith("/sitemaps")) {
			return json(sitemapBody);
		}
		const next = queue.shift();
		return next instanceof Response ? next : json(next ?? { rows: [] });
	});
};
const analyticsCalls = (fetcher) =>
	fetcher.mock.calls.filter(([url]) => url.endsWith("/searchAnalytics/query"));

afterEach(() => {
	process.exitCode = undefined;
	vi.restoreAllMocks();
});

describe("GSC 수요 기간 계산", () => {
	it("도메인 이전일부터 PT 오늘에서 확정 지연 3일을 뺀 날까지를 포함 일수와 함께 만든다", () => {
		expect(resolveDemandPeriod(NOW)).toEqual({
			startDate: "2026-09-02",
			endDate: "2026-10-07",
			days: 36,
		});
	});

	it("UTC로 같은 날이어도 PT 날짜가 바뀌면 끝 날짜도 하루 늦어진다", () => {
		expect(resolveDemandPeriod(new Date("2026-10-11T20:00:00Z")).endDate).toBe(
			"2026-10-08",
		);
	});
});

describe("GSC 수요 수집", () => {
	it("query×page 차원·최대 행 수·확정 데이터로 기간 전체를 조회한다", async () => {
		const fetcher = createFetcher();
		await collectGscDemand({ serviceAccountJson: "{}", now: NOW, fetcher, tokenExchanger, sleep });

		const [url, init] = analyticsCalls(fetcher)[0];
		expect(url).toContain(encodeURIComponent(GSC_SITE_URL));
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body)).toEqual({
			startDate: "2026-09-02",
			endDate: "2026-10-07",
			dimensions: ["query", "page"],
			rowLimit: 25000,
			startRow: 0,
			dataState: "final",
		});
	});

	it("응답 행이 최대치보다 적어질 때까지 startRow를 늘려 이어 받는다", async () => {
		const full = { rows: Array.from({ length: GSC_ROW_LIMIT }, (_, index) => apiRow({ query: `q${index}`, page: "p" })) };
		const fetcher = createFetcher({
			analytics: [full, full, { rows: [apiRow({ query: "a", page: "p" }), apiRow({ query: "b", page: "p" }), apiRow({ query: "c", page: "p" })] }],
		});
		const report = await collectGscDemand({ serviceAccountJson: "{}", now: NOW, fetcher, tokenExchanger, sleep });

		const startRows = analyticsCalls(fetcher).map(([, init]) => JSON.parse(init.body).startRow);
		expect(startRows).toEqual([0, 25000, 50000]);
		expect(report.rows).toHaveLength(50003);
	});

	it("첫 응답이 최대치보다 적으면 한 번만 조회한다", async () => {
		const fetcher = createFetcher({ analytics: [{ rows: [apiRow({ query: "a", page: "p" })] }] });
		await collectGscDemand({ serviceAccountJson: "{}", now: NOW, fetcher, tokenExchanger, sleep });

		expect(analyticsCalls(fetcher)).toHaveLength(1);
	});

	it("사이트맵 목록은 본문 없이 GET으로 조회한다", async () => {
		const fetcher = createFetcher();
		await collectGscDemand({ serviceAccountJson: "{}", now: NOW, fetcher, tokenExchanger, sleep });

		const [url, init] = fetcher.mock.calls.find(([callUrl]) => callUrl.endsWith("/sitemaps"));
		expect(url).toBe(
			`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/sitemaps`,
		);
		expect(init.method).toBe("GET");
		expect(init.body).toBeUndefined();
	});

	it("시크릿이 없으면 시크릿 없음 오류를 던진다", async () => {
		await expect(
			collectGscDemand({ serviceAccountJson: "", now: NOW, fetcher: createFetcher(), tokenExchanger, sleep }),
		).rejects.toThrow("시크릿 없음");
	});

	it("403이면 조회 권한이 없다고 알린다", async () => {
		const fetcher = createFetcher({ analytics: [json({}, 403)] });
		await expect(
			collectGscDemand({ serviceAccountJson: "{}", now: NOW, fetcher, tokenExchanger, sleep }),
		).rejects.toThrow("Search Console 조회 권한이 없습니다.");
	});

	it("429가 이어지면 총 3번 시도한 뒤 요청 한도 초과로 실패한다", async () => {
		const fetcher = createFetcher({ analytics: [json({}, 429), json({}, 429), json({}, 429), json({}, 429)] });
		await expect(
			collectGscDemand({ serviceAccountJson: "{}", now: NOW, fetcher, tokenExchanger, sleep }),
		).rejects.toThrow("요청 한도를 초과");
		expect(analyticsCalls(fetcher)).toHaveLength(3);
	});
});

describe("기회 검색어", () => {
	const only = (rows) => summarizeOpportunities(rows).map((entry) => entry.query);

	it("노출·클릭·평균 순위 경계값을 포함 범위로 지킨다", () => {
		expect(
			only([
				row({ query: "노출4", impressions: 4 }),
				row({ query: "노출5", impressions: 5 }),
				row({ query: "클릭1", clicks: 1 }),
				row({ query: "클릭2", clicks: 2 }),
				row({ query: "순위3.9", position: 3.9 }),
				row({ query: "순위4", position: 4 }),
				row({ query: "순위30", position: 30 }),
				row({ query: "순위30.1", position: 30.1 }),
			]).sort(),
		).toEqual(["노출5", "순위30", "순위4", "클릭1"].sort());
	});

	it("노출 내림차순으로 최대 100개만 남긴다", () => {
		const rows = Array.from({ length: 150 }, (_, index) =>
			row({ query: `q${index}`, impressions: 5 + index }),
		);
		const result = summarizeOpportunities(rows);

		expect(result).toHaveLength(100);
		expect(result[0].impressions).toBe(154);
		expect(result.at(-1).impressions).toBe(55);
		for (let index = 1; index < result.length; index += 1) {
			expect(result[index - 1].impressions).toBeGreaterThanOrEqual(result[index].impressions);
		}
	});

	it("여러 페이지에 걸친 검색어를 하나로 합치고 페이지 목록을 붙인다", () => {
		const result = summarizeOpportunities([
			row({ query: "메모", page: "https://www.webmemo.xyz/ko/introduce", impressions: 6, position: 8 }),
			row({ query: "메모", page: "https://www.webmemo.xyz/ko/features/memo", impressions: 4, position: 13 }),
		]);

		expect(result).toEqual([
			{
				query: "메모",
				clicks: 0,
				impressions: 10,
				position: 10,
				pages: ["https://www.webmemo.xyz/ko/introduce", "https://www.webmemo.xyz/ko/features/memo"],
			},
		]);
	});
});

describe("공개 페이지 성과", () => {
	it("언어 접두사를 떼고 공개 경로 묶음으로 합산하며 다른 경로는 넣지 않는다", () => {
		const groups = summarizePublicPages([
			row({ page: "https://www.webmemo.xyz/ko/use-cases/a", impressions: 10, clicks: 1 }),
			row({ page: "https://www.webmemo.xyz/en/use-cases/b", impressions: 5 }),
			row({ page: "https://www.webmemo.xyz/ko", impressions: 100 }),
			row({ page: "https://www.webmemo.xyz/ko/memos", impressions: 100 }),
		]);
		const byKey = Object.fromEntries(groups.map((group) => [group.key, group]));

		expect(groups.map((group) => group.key)).toEqual(["use-cases", "features", "compare", "introduce"]);
		expect(byKey["use-cases"]).toMatchObject({ impressions: 15, clicks: 1 });
		expect(byKey["use-cases"].pages).toHaveLength(2);
		expect(byKey.features).toMatchObject({ impressions: 0, clicks: 0, pages: [] });
		expect(byKey.introduce.impressions).toBe(0);
	});
});

describe("사이트맵 요약", () => {
	it("제출·다운로드 시각, 대기 여부, 경고·오류, 제출·색인 URL 수를 숫자로 남긴다", () => {
		const [sitemap] = summarizeSitemaps({
			sitemap: [
				{
					path: "https://www.webmemo.xyz/sitemap.xml",
					lastSubmitted: "2026-09-03T00:00:00Z",
					lastDownloaded: "2026-10-09T00:00:00Z",
					isPending: false,
					warnings: "1",
					errors: "0",
					contents: [{ type: "web", submitted: "25", indexed: "2" }],
				},
			],
		});

		expect(sitemap).toEqual({
			path: "https://www.webmemo.xyz/sitemap.xml",
			lastSubmitted: "2026-09-03T00:00:00Z",
			lastDownloaded: "2026-10-09T00:00:00Z",
			isPending: false,
			warnings: 1,
			errors: 0,
			contents: [{ type: "web", submitted: 25, indexed: 2 }],
			submitted: 25,
			indexed: 2,
		});
		const markdown = createDemandMarkdown({
			period: { startDate: "2026-09-02", endDate: "2026-10-07", days: 36 },
			rows: [],
			summary: { opportunities: [], publicPages: [], sitemaps: [sitemap] },
		});
		expect(markdown).toContain(
			"| https://www.webmemo.xyz/sitemap.xml | 2026-09-03T00:00:00Z | 2026-10-09T00:00:00Z | 아니오 | 1 | 0 | 25 | 2 |",
		);
	});

	it("제출된 사이트맵이 없으면 제출 안내를 쓴다", () => {
		expect(summarizeSitemaps({})).toEqual([]);
		const markdown = createDemandMarkdown({
			period: { startDate: "2026-09-02", endDate: "2026-10-07", days: 36 },
			rows: [row({})],
			summary: { opportunities: [], publicPages: summarizePublicPages([]), sitemaps: [] },
		});
		expect(markdown).toContain(
			"제출된 사이트맵 없음 — GSC 콘솔에서 https://www.webmemo.xyz/sitemap.xml 제출 필요",
		);
	});
});

describe("수요 리포트 마크다운", () => {
	const period = { startDate: "2026-09-02", endDate: "2026-10-07", days: 36 };

	it("데이터가 0행이면 표 대신 데이터 부족을 쓰고 사이트맵 진단만 보인다", () => {
		const markdown = createDemandMarkdown({
			period,
			rows: [],
			summary: { opportunities: [], publicPages: summarizePublicPages([]), sitemaps: [] },
		});

		expect(markdown).toContain("데이터 부족 — 36일치");
		expect(markdown).toContain("## 사이트맵 상태");
		expect(markdown).not.toContain("## 기회 검색어");
		expect(markdown).not.toContain("## 공개 페이지 성과");
	});

	it("데이터가 있으면 기회 검색어·공개 페이지 성과·사이트맵 순서로 표 3개와 데이터 일수를 쓴다", () => {
		const rows = [row({ query: "유튜브 메모", page: "https://www.webmemo.xyz/ko/use-cases/youtube-notes" })];
		const markdown = createDemandMarkdown({
			period,
			rows,
			summary: {
				opportunities: summarizeOpportunities(rows),
				publicPages: summarizePublicPages(rows),
				sitemaps: summarizeSitemaps({ sitemap: [{ path: "s", contents: [] }] }),
			},
		});

		expect(markdown).toContain("(36일치)");
		const order = ["## 기회 검색어", "## 공개 페이지 성과", "## 사이트맵 상태"].map((title) =>
			markdown.indexOf(title),
		);
		expect(order.every((index) => index >= 0)).toBe(true);
		expect([...order].sort((left, right) => left - right)).toEqual(order);
		expect(markdown.match(/^\|---/gm)).toHaveLength(3);
	});

	it("검색어의 파이프와 개행이 표 칸을 깨지 않는다", () => {
		expect(escapeTableCell("a|b")).toBe("a\\|b");
		expect(escapeTableCell("c\nd")).toBe("c d");
		const rows = [row({ query: "a|b" }), row({ query: "c\nd" })];
		const markdown = createDemandMarkdown({
			period,
			rows,
			summary: { opportunities: summarizeOpportunities(rows), publicPages: summarizePublicPages(rows), sitemaps: [] },
		});
		const tableRows = markdown.split("\n").filter((line) => line.startsWith("| a\\|b") || line.startsWith("| c d"));
		const headerColumns = "| 검색어 | 노출 | 클릭 | 평균 순위 | 노출된 페이지 |".split(/(?<!\\)\|/).length;

		expect(tableRows).toHaveLength(2);
		for (const line of tableRows) {
			expect(line.split(/(?<!\\)\|/)).toHaveLength(headerColumns);
		}
	});
});

describe("수요 리포트 저장", () => {
	it("시크릿이 없으면 파일을 만들지 않고 실패 종료한다", async () => {
		const outputDir = await mkdtemp(join(tmpdir(), "gsc-demand-"));
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		const report = await runGscDemandExport({ serviceAccountJson: "", outputDir, stepSummaryPath: undefined });

		expect(report).toBeNull();
		expect(process.exitCode).toBe(1);
		expect(error.mock.calls[0][0]).toContain("시크릿 없음");
		expect(await readdir(outputDir)).toEqual([]);
	});

	it("원자료와 세 요약을 담은 JSON과 마크다운을 쓴다", async () => {
		const outputDir = await mkdtemp(join(tmpdir(), "gsc-demand-"));
		vi.spyOn(console, "log").mockImplementation(() => {});
		const fetcher = createFetcher({
			analytics: [{ rows: [apiRow({ query: "웹 메모", page: "https://www.webmemo.xyz/ko/introduce" })] }],
		});

		await runGscDemandExport({
			serviceAccountJson: "{}",
			outputDir,
			stepSummaryPath: undefined,
			now: NOW,
			fetcher,
			tokenExchanger,
			sleep,
		});

		const saved = JSON.parse(await readFile(join(outputDir, "gsc-demand.json"), "utf8"));
		expect(saved.rows).toHaveLength(1);
		expect(Object.keys(saved.summary).sort()).toEqual(["opportunities", "publicPages", "sitemaps"]);
		expect(await readFile(join(outputDir, "gsc-demand.md"), "utf8")).toContain("# Web Memo GSC 수요 리포트");
		expect(process.exitCode).toBeUndefined();
	});
});
