import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";
import {
	GSC_READONLY_SCOPE,
	GSC_SITE_URL,
	requestGsc,
	resolveGscWeeks,
	safeFailure,
} from "./seo-gsc.mjs";

/** 웹 도메인을 webmemo.xyz로 옮긴 날입니다. 새 Search Console 속성에는 이보다 앞선 데이터가 없습니다. */
export const DOMAIN_MIGRATION_DATE = "2026-09-02";
/** searchAnalytics.query 한 번에 받을 수 있는 최대 행 수입니다. */
export const GSC_ROW_LIMIT = 25000;

/** 노출은 있는데 클릭으로 이어지지 않는 검색어를 고르는 기준입니다. */
export const OPPORTUNITY_RULE = {
	minImpressions: 5,
	maxClicks: 1,
	minPosition: 4,
	maxPosition: 30,
	limit: 100,
};

/** 조합 페이지 판단에 쓰는 공개 페이지 묶음입니다. 경로는 언어 접두사(/ko·/en)를 뗀 기준입니다. */
export const PUBLIC_PAGE_GROUPS = [
	{ key: "use-cases", prefix: "/use-cases/" },
	{ key: "features", prefix: "/features/" },
	{ key: "compare", prefix: "/compare/" },
	{ key: "introduce", prefix: "/introduce" },
];

const SITEMAP_URL = new URL("sitemap.xml", GSC_SITE_URL).href;
const ANALYTICS_URL = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`;
const SITEMAPS_URL = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/sitemaps`;

const countDays = (startDate, endDate) =>
	Math.round(
		(Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) /
			86_400_000,
	) + 1;

/** 도메인 이전일부터 PT 기준 확정 지연을 뺀 날까지의 조회 기간을 만듭니다. */
export const resolveDemandPeriod = (now = new Date()) => {
	const endDate = resolveGscWeeks(now).end;

	return {
		startDate: DOMAIN_MIGRATION_DATE,
		endDate,
		days: countDays(DOMAIN_MIGRATION_DATE, endDate),
	};
};

const fetchAllRows = async ({ accessToken, period, fetcher, sleep }) => {
	const rows = [];
	for (let startRow = 0; ; startRow += GSC_ROW_LIMIT) {
		const response = await requestGsc({
			url: ANALYTICS_URL,
			accessToken,
			fetcher,
			sleep,
			body: {
				startDate: period.startDate,
				endDate: period.endDate,
				dimensions: ["query", "page"],
				rowLimit: GSC_ROW_LIMIT,
				startRow,
				dataState: "final",
			},
		});
		const page = (response.rows ?? []).map((row) => ({
			query: row.keys?.[0] ?? "",
			page: row.keys?.[1] ?? "",
			clicks: row.clicks ?? 0,
			impressions: row.impressions ?? 0,
			ctr: row.ctr ?? 0,
			position: row.position ?? 0,
		}));
		rows.push(...page);
		if (page.length < GSC_ROW_LIMIT) {
			return rows;
		}
	}
};

const toCount = (value) => (value === undefined ? null : Number(value));

/** sitemaps.list 응답에서 제출·색인 상태만 남깁니다. */
export const summarizeSitemaps = (response) =>
	(response?.sitemap ?? []).map((sitemap) => {
		const contents = (sitemap.contents ?? []).map((content) => ({
			type: content.type ?? null,
			submitted: toCount(content.submitted),
			indexed: toCount(content.indexed),
		}));

		return {
			path: sitemap.path ?? null,
			lastSubmitted: sitemap.lastSubmitted ?? null,
			lastDownloaded: sitemap.lastDownloaded ?? null,
			isPending: sitemap.isPending ?? null,
			warnings: toCount(sitemap.warnings),
			errors: toCount(sitemap.errors),
			contents,
			submitted: contents.reduce((sum, content) => sum + (content.submitted ?? 0), 0),
			indexed: contents.reduce((sum, content) => sum + (content.indexed ?? 0), 0),
		};
	});

const weightedPosition = (positionSum, impressions) =>
	impressions > 0 ? positionSum / impressions : 0;

/** query×page 행을 검색어로 합친 뒤 기회 검색어 기준에 맞는 것만 노출순으로 고릅니다. */
export const summarizeOpportunities = (rows, rule = OPPORTUNITY_RULE) => {
	const byQuery = new Map();
	for (const row of rows) {
		const entry = byQuery.get(row.query) ?? {
			query: row.query,
			clicks: 0,
			impressions: 0,
			positionSum: 0,
			pages: new Set(),
		};
		entry.clicks += row.clicks;
		entry.impressions += row.impressions;
		// 평균 순위는 노출 가중 평균입니다. 노출이 적은 페이지의 순위가 결과를 끌고 가지 않게 합니다.
		entry.positionSum += row.position * row.impressions;
		entry.pages.add(row.page);
		byQuery.set(row.query, entry);
	}

	return [...byQuery.values()]
		.map(({ positionSum, pages, ...entry }) => ({
			...entry,
			position: weightedPosition(positionSum, entry.impressions),
			pages: [...pages],
		}))
		.filter(
			(entry) =>
				entry.impressions >= rule.minImpressions &&
				entry.clicks <= rule.maxClicks &&
				entry.position >= rule.minPosition &&
				entry.position <= rule.maxPosition,
		)
		.sort((left, right) => right.impressions - left.impressions)
		.slice(0, rule.limit);
};

const toLocalePath = (pageUrl) => {
	try {
		return new URL(pageUrl).pathname.replace(/^\/(ko|en)(?=\/|$)/, "") || "/";
	} catch {
		return null;
	}
};

const matchesGroup = (path, prefix) =>
	prefix.endsWith("/")
		? path.startsWith(prefix)
		: path === prefix || path.startsWith(`${prefix}/`);

/** 공개 페이지 묶음별로 노출·클릭을 합산합니다. 데이터가 없는 묶음도 0으로 남깁니다. */
export const summarizePublicPages = (rows) =>
	PUBLIC_PAGE_GROUPS.map(({ key, prefix }) => {
		const pages = new Map();
		for (const row of rows) {
			const path = toLocalePath(row.page);
			if (!path || !matchesGroup(path, prefix)) {
				continue;
			}
			const page = pages.get(row.page) ?? {
				page: row.page,
				clicks: 0,
				impressions: 0,
				positionSum: 0,
			};
			page.clicks += row.clicks;
			page.impressions += row.impressions;
			page.positionSum += row.position * row.impressions;
			pages.set(row.page, page);
		}
		const pageRows = [...pages.values()]
			.map(({ positionSum, ...page }) => ({
				...page,
				position: weightedPosition(positionSum, page.impressions),
			}))
			.sort((left, right) => right.impressions - left.impressions);
		const clicks = pageRows.reduce((sum, page) => sum + page.clicks, 0);
		const impressions = pageRows.reduce((sum, page) => sum + page.impressions, 0);
		const positionSum = pageRows.reduce(
			(sum, page) => sum + page.position * page.impressions,
			0,
		);

		return {
			key,
			prefix,
			clicks,
			impressions,
			position: weightedPosition(positionSum, impressions),
			pages: pageRows,
		};
	});

/** 서비스 계정으로 GSC 검색 성과 전체 행과 사이트맵 상태를 읽어 리포트를 만듭니다. 실패하면 Error를 던집니다. */
export const collectGscDemand = async ({
	serviceAccountJson,
	now = new Date(),
	fetcher = fetch,
	tokenExchanger = exchangeServiceAccountToken,
	sleep = (milliseconds) =>
		new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) => {
	if (!serviceAccountJson) {
		throw new Error("시크릿 없음: GSC_SERVICE_ACCOUNT_JSON이 등록되지 않았습니다.");
	}
	let serviceAccount;
	try {
		serviceAccount = JSON.parse(serviceAccountJson);
	} catch {
		throw new Error("서비스 계정 JSON 형식이 올바르지 않습니다.");
	}
	let accessToken;
	try {
		accessToken = await tokenExchanger({ serviceAccount, scope: GSC_READONLY_SCOPE });
	} catch {
		throw new Error("Search Console 인증에 실패했습니다.");
	}
	const period = resolveDemandPeriod(now);
	try {
		const rows = await fetchAllRows({ accessToken, period, fetcher, sleep });
		const sitemaps = summarizeSitemaps(
			await requestGsc({ url: SITEMAPS_URL, method: "GET", accessToken, fetcher, sleep }),
		);

		return {
			generatedAt: now.toISOString(),
			siteUrl: GSC_SITE_URL,
			period,
			rows,
			summary: {
				opportunities: summarizeOpportunities(rows),
				publicPages: summarizePublicPages(rows),
				sitemaps,
			},
		};
	} catch (error) {
		throw new Error(safeFailure(error).message);
	}
};

/** 외부 사용자 입력(검색어)이 마크다운 표의 칸을 깨지 않게 합니다. */
export const escapeTableCell = (value) =>
	String(value ?? "")
		.replace(/\\/g, "\\\\")
		.replace(/\|/g, "\\|")
		.replace(/\r\n|\r|\n/g, " ");

const formatNumber = (value) => (value === null ? "-" : String(value));
const formatPercent = (clicks, impressions) =>
	impressions > 0 ? `${((clicks / impressions) * 100).toFixed(1)}%` : "-";
const formatPosition = (position) => (position > 0 ? position.toFixed(1) : "-");

const createSitemapSection = (sitemaps) => {
	const lines = ["## 사이트맵 상태", ""];
	if (sitemaps.length === 0) {
		lines.push(`제출된 사이트맵 없음 — GSC 콘솔에서 ${SITEMAP_URL} 제출 필요`, "");
		return lines;
	}
	lines.push(
		"| 경로 | 마지막 제출 | 마지막 다운로드 | 처리 대기 | 경고 | 오류 | 제출 URL | 색인 URL |",
		"|---|---|---|---|---|---|---|---|",
		...sitemaps.map((sitemap) =>
			[
				escapeTableCell(sitemap.path),
				escapeTableCell(sitemap.lastSubmitted ?? "-"),
				escapeTableCell(sitemap.lastDownloaded ?? "-"),
				sitemap.isPending === null ? "-" : sitemap.isPending ? "예" : "아니오",
				formatNumber(sitemap.warnings),
				formatNumber(sitemap.errors),
				String(sitemap.submitted),
				String(sitemap.indexed),
			].join(" | "),
		).map((row) => `| ${row} |`),
		"",
	);

	return lines;
};

const createOpportunitySection = (opportunities) => {
	const rule = OPPORTUNITY_RULE;
	const lines = [
		"## 기회 검색어",
		"",
		`노출 ${rule.minImpressions}회 이상 · 클릭 ${rule.maxClicks}회 이하 · 평균 순위 ${rule.minPosition}~${rule.maxPosition}위 (노출순 최대 ${rule.limit}개)`,
		"",
	];
	if (opportunities.length === 0) {
		lines.push("조건에 맞는 검색어가 없습니다.", "");
		return lines;
	}
	lines.push(
		"| 검색어 | 노출 | 클릭 | 평균 순위 | 노출된 페이지 |",
		"|---|---|---|---|---|",
		...opportunities.map(
			(entry) =>
				`| ${escapeTableCell(entry.query)} | ${entry.impressions} | ${entry.clicks} | ${formatPosition(entry.position)} | ${entry.pages.map(escapeTableCell).join("<br>")} |`,
		),
		"",
	);

	return lines;
};

const createPublicPageSection = (groups) => [
	"## 공개 페이지 성과",
	"",
	"| 묶음·페이지 | 노출 | 클릭 | CTR | 평균 순위 |",
	"|---|---|---|---|---|",
	...groups.flatMap((group) => [
		`| **${group.key}** (${group.prefix}) | ${group.impressions} | ${group.clicks} | ${formatPercent(group.clicks, group.impressions)} | ${formatPosition(group.position)} |`,
		...group.pages.map(
			(page) =>
				`| ${escapeTableCell(page.page)} | ${page.impressions} | ${page.clicks} | ${formatPercent(page.clicks, page.impressions)} | ${formatPosition(page.position)} |`,
		),
	]),
	"",
];

/** 사람이 읽는 수요 리포트를 만듭니다. 데이터가 없으면 사이트맵 진단을 맨 위에 둡니다. */
export const createDemandMarkdown = (report) => {
	const { period, rows, summary } = report;
	const header = [
		"# Web Memo GSC 수요 리포트",
		"",
		`기간: ${period.startDate} ~ ${period.endDate} (${period.days}일치) · 수집 행 ${rows.length}개`,
		"",
	];
	if (rows.length === 0) {
		return [
			...header,
			`데이터 부족 — ${period.days}일치 동안 검색 노출 데이터가 없습니다. 색인 상태부터 확인하세요.`,
			"",
			...createSitemapSection(summary.sitemaps),
		].join("\n");
	}

	return [
		...header,
		...createOpportunitySection(summary.opportunities),
		...createPublicPageSection(summary.publicPages),
		...createSitemapSection(summary.sitemaps),
	].join("\n");
};

/** GSC 수요 리포트를 artifacts/seo에 JSON·Markdown으로 저장합니다. 실패하면 파일 없이 종료 코드 1로 끝냅니다. */
export const runGscDemandExport = async ({
	serviceAccountJson = process.env.GSC_SERVICE_ACCOUNT_JSON,
	outputDir = "artifacts/seo",
	stepSummaryPath = process.env.GITHUB_STEP_SUMMARY,
	...options
} = {}) => {
	let report;
	try {
		report = await collectGscDemand({ serviceAccountJson, ...options });
	} catch (error) {
		console.error(`GSC 수요 리포트 실패: ${error.message}`);
		process.exitCode = 1;
		return null;
	}
	const markdown = createDemandMarkdown(report);
	await mkdir(outputDir, { recursive: true });
	await writeFile(join(outputDir, "gsc-demand.json"), `${JSON.stringify(report, null, 2)}\n`);
	await writeFile(join(outputDir, "gsc-demand.md"), markdown);
	if (stepSummaryPath) {
		await appendFile(stepSummaryPath, markdown);
	}
	console.log(
		`GSC 수요 리포트 완료: ${report.period.startDate}~${report.period.endDate} · 행 ${report.rows.length}개`,
	);

	return report;
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await runGscDemandExport();
}
