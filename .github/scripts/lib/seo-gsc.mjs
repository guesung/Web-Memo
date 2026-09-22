import { exchangeServiceAccountToken } from "./google-auth.mjs";

/** Web Memo Search Console 속성입니다. */
export const GSC_SITE_URL = "https://www.webmemo.xyz/";
/** Search Console 조회 전용 OAuth 범위입니다. */
export const GSC_READONLY_SCOPE =
	"https://www.googleapis.com/auth/webmasters.readonly";

const INSPECTION_ENDPOINT =
	"https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const FINAL_DATA_LAG_DAYS = 3;

const shiftDate = (date, days) => {
	const shifted = new Date(`${date}T12:00:00Z`);
	shifted.setUTCDate(shifted.getUTCDate() + days);

	return shifted.toISOString().slice(0, 10);
};

const getPacificDate = (now) =>
	new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Los_Angeles",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);

/** PT 기준으로 확정 지연을 제외한 최근 7일과 직전 7일을 계산합니다. */
export const resolveGscWeeks = (now = new Date()) => {
	const pacificToday = getPacificDate(now);
	const end = shiftDate(pacificToday, -FINAL_DATA_LAG_DAYS);
	const start = shiftDate(end, -6);
	const previousEnd = shiftDate(start, -1);

	return {
		start,
		end,
		previousStart: shiftDate(previousEnd, -6),
		previousEnd,
	};
};

const safeFailure = (error) => {
	const message = error instanceof Error ? error.message : String(error);
	const status = Number(message.match(/^([45]\d\d)\b/)?.[1]);
	if (status === 403) {
		return { code: "permission_denied", message: "Search Console 조회 권한이 없습니다." };
	}
	if (status === 429) {
		return { code: "rate_limited", message: "Search Console 요청 한도를 초과했습니다." };
	}
	if (status >= 500) {
		return { code: "service_unavailable", message: "Search Console API가 일시적으로 응답하지 않습니다." };
	}

	return { code: "request_failed", message: "Search Console 요청에 실패했습니다." };
};

const requestGsc = async ({
	url,
	accessToken,
	body,
	fetcher,
	sleep,
	maximumAttempts = 3,
}) => {
	for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
		const response = await fetcher(url, {
			method: "POST",
			headers: {
				authorization: `Bearer ${accessToken}`,
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		});
		if (response.ok) {
			return await response.json();
		}
		const canRetry = response.status === 429 || response.status >= 500;
		if (canRetry && attempt < maximumAttempts) {
			await sleep(250 * 2 ** (attempt - 1));
			continue;
		}
		throw new Error(`${response.status} Search Console API request failed`);
	}
};

const inspectUrl = async ({ url, accessToken, fetcher, sleep }) => {
	const response = await requestGsc({
		url: INSPECTION_ENDPOINT,
		accessToken,
		fetcher,
		sleep,
		body: { inspectionUrl: url, siteUrl: GSC_SITE_URL },
	});
	const result = response.inspectionResult?.indexStatusResult ?? {};

	return {
		url,
		verdict: result.verdict ?? null,
		coverageState: result.coverageState ?? null,
		indexingState: result.indexingState ?? null,
		robotsTxtState: result.robotsTxtState ?? null,
		pageFetchState: result.pageFetchState ?? null,
		lastCrawlTime: result.lastCrawlTime ?? null,
		googleCanonical: result.googleCanonical ?? null,
		userCanonical: result.userCanonical ?? null,
	};
};

const queryAnalytics = async ({ accessToken, body, fetcher, sleep }) =>
	await requestGsc({
		url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
		accessToken,
		body: { dataState: "final", ...body },
		fetcher,
		sleep,
	});

const normalizeRows = (response) =>
	(response.rows ?? []).map((row) => ({
		keys: row.keys ?? [],
		clicks: row.clicks ?? 0,
		impressions: row.impressions ?? 0,
		ctr: row.ctr ?? 0,
		position: row.position ?? 0,
	}));

const readWeeklyPerformance = async ({ accessToken, week, fetcher, sleep }) => {
	const total = (startDate, endDate) =>
		queryAnalytics({
			accessToken,
			fetcher,
			sleep,
			body: { startDate, endDate },
		});
	const ranked = (dimension) =>
		queryAnalytics({
			accessToken,
			fetcher,
			sleep,
			body: {
				startDate: week.start,
				endDate: week.end,
				dimensions: [dimension],
				rowLimit: 10,
			},
		});
	const [current, previous, queries, pages] = await Promise.all([
		total(week.start, week.end),
		total(week.previousStart, week.previousEnd),
		ranked("query"),
		ranked("page"),
	]);

	return {
		week,
		current: normalizeRows(current)[0] ?? null,
		previous: normalizeRows(previous)[0] ?? null,
		topQueries: normalizeRows(queries),
		topPages: normalizeRows(pages),
	};
};

/** sitemap URL 색인 상태와 선택적인 주간 검색 성과를 안전한 필드만 남겨 조회합니다. */
export const collectGscReport = async ({
	serviceAccountJson,
	urls,
	weekly = false,
	now = new Date(),
	fetcher = fetch,
	tokenExchanger = exchangeServiceAccountToken,
	sleep = (milliseconds) =>
		new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) => {
	if (!serviceAccountJson) {
		return {
			generatedAt: now.toISOString(),
			status: "skipped",
			siteUrl: GSC_SITE_URL,
			reason: "GSC_SERVICE_ACCOUNT_JSON이 등록되지 않았습니다.",
			inspections: [],
			weekly: null,
		};
	}
	let serviceAccount;
	try {
		serviceAccount = JSON.parse(serviceAccountJson);
	} catch {
		return createFailedReport(now, "invalid_credentials", "서비스 계정 JSON 형식이 올바르지 않습니다.");
	}
	let accessToken;
	try {
		accessToken = await tokenExchanger({
			serviceAccount,
			scope: GSC_READONLY_SCOPE,
		});
	} catch {
		return createFailedReport(now, "authentication_failed", "Search Console 인증에 실패했습니다.");
	}
	const report = {
		generatedAt: now.toISOString(),
		status: "passed",
		siteUrl: GSC_SITE_URL,
		inspections: [],
		weekly: null,
		failures: [],
	};
	for (const url of [...new Set(urls)]) {
		try {
			report.inspections.push(
				await inspectUrl({ url, accessToken, fetcher, sleep }),
			);
		} catch (error) {
			report.failures.push({ url, ...safeFailure(error) });
		}
	}
	if (weekly) {
		try {
			report.weekly = await readWeeklyPerformance({
				accessToken,
				week: resolveGscWeeks(now),
				fetcher,
				sleep,
			});
		} catch (error) {
			report.failures.push({ scope: "weekly", ...safeFailure(error) });
		}
	}
	if (report.failures.length > 0) {
		report.status = "failed";
	}

	return report;
};

const createFailedReport = (now, code, message) => ({
	generatedAt: now.toISOString(),
	status: "failed",
	siteUrl: GSC_SITE_URL,
	inspections: [],
	weekly: null,
	failures: [{ scope: "setup", code, message }],
});

/** GSC 결과를 GitHub 실행 요약에 적합한 Markdown으로 변환합니다. */
export const createGscMarkdown = (report) => {
	const escapeMarkdown = (value) =>
		String(value).replace(/[|\r\n]/g, (character) =>
			character === "|" ? "&#124;" : " ",
		);
	const lines = ["# Web Memo Search Console 검사", "", `상태: ${report.status}`, ""];
	if (report.reason) {
		lines.push(report.reason, "");
	}
	lines.push(
		`색인 확인 성공 ${report.inspections.length}건 · 실패 ${report.failures?.filter((failure) => failure.url).length ?? 0}건`,
	);
	for (const inspection of report.inspections) {
		lines.push(`- ${inspection.url}: ${inspection.verdict ?? "UNKNOWN"} (${inspection.coverageState ?? "상태 없음"})`);
	}
	for (const failure of report.failures ?? []) {
		lines.push(`- 실패: ${failure.url ?? failure.scope} · ${failure.message}`);
	}
	if (report.weekly) {
		const { current, previous, topQueries, topPages, week } = report.weekly;
		lines.push(
			"",
			`## 주간 성과: ${week.start} ~ ${week.end}`,
			"",
			`현재 클릭 ${current?.clicks ?? 0}회 · 노출 ${current?.impressions ?? 0}회`,
			"",
			`직전 클릭 ${previous?.clicks ?? 0}회 · 노출 ${previous?.impressions ?? 0}회`,
			"",
			"| 상위 검색어 | 클릭 | 노출 |",
			"| --- | ---: | ---: |",
			...topQueries.map(
				(row) =>
					`| ${escapeMarkdown(row.keys[0] ?? "")} | ${row.clicks} | ${row.impressions} |`,
			),
			"",
			"| 상위 페이지 | 클릭 | 노출 |",
			"| --- | ---: | ---: |",
			...topPages.map(
				(row) =>
					`| ${escapeMarkdown(row.keys[0] ?? "")} | ${row.clicks} | ${row.impressions} |`,
			),
		);
	}

	return `${lines.join("\n")}\n`;
};
