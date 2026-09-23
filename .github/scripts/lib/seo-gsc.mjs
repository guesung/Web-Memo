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

/** 확정 지연을 뺀 날짜 기준으로 끝난 달 3개의 기간을 오래된 순으로 만듭니다. */
export const resolveGscMonths = (now = new Date()) => {
	const anchor = shiftDate(getPacificDate(now), -FINAL_DATA_LAG_DAYS);
	const [year, month] = anchor.split("-").map(Number);
	const months = [];
	for (let offset = 3; offset >= 1; offset -= 1) {
		const start = new Date(Date.UTC(year, month - 1 - offset, 1));
		const end = new Date(Date.UTC(year, month - offset, 0));
		months.push({
			month: start.toISOString().slice(0, 7),
			startDate: start.toISOString().slice(0, 10),
			endDate: end.toISOString().slice(0, 10),
		});
	}

	return months;
};

const attachPreviousRows = ({ currentRows, previousRows }) => {
	const previousByKey = new Map(
		previousRows.map((row) => [row.keys.join("\u001f"), row]),
	);

	return currentRows.map((row) => {
		const previous = previousByKey.get(row.keys.join("\u001f"));

		return {
			...row,
			// 직전 주 조회 범위 밖이면 0이 아니라 모름입니다. 0으로 두면 증감률이 무한대로 튑니다.
			previous: previous
				? {
						clicks: previous.clicks,
						impressions: previous.impressions,
						ctr: previous.ctr,
						position: previous.position,
					}
				: null,
		};
	});
};

const readWeeklyPerformance = async ({ accessToken, week, fetcher, sleep }) => {
	const query = (body) =>
		queryAnalytics({ accessToken, fetcher, sleep, body });
	const total = (startDate, endDate) => query({ startDate, endDate });
	// 이번 주 상위 행의 직전 주 값을 찾으려고 직전 주는 더 넓게 조회합니다.
	const ranked = ({ dimension, startDate, endDate, rowLimit }) =>
		query({ startDate, endDate, dimensions: [dimension], rowLimit });
	const [
		current,
		previous,
		queries,
		previousQueries,
		pages,
		previousPages,
	] = await Promise.all([
		total(week.start, week.end),
		total(week.previousStart, week.previousEnd),
		ranked({ dimension: "query", startDate: week.start, endDate: week.end, rowLimit: 50 }),
		ranked({ dimension: "query", startDate: week.previousStart, endDate: week.previousEnd, rowLimit: 250 }),
		ranked({ dimension: "page", startDate: week.start, endDate: week.end, rowLimit: 50 }),
		ranked({ dimension: "page", startDate: week.previousStart, endDate: week.previousEnd, rowLimit: 250 }),
	]);

	return {
		week,
		current: normalizeRows(current)[0] ?? null,
		previous: normalizeRows(previous)[0] ?? null,
		topQueries: attachPreviousRows({
			currentRows: normalizeRows(queries),
			previousRows: normalizeRows(previousQueries),
		}),
		topPages: attachPreviousRows({
			currentRows: normalizeRows(pages),
			previousRows: normalizeRows(previousPages),
		}),
	};
};

const readMonthlyPerformance = async ({ accessToken, months, fetcher, sleep }) => {
	const totals = await Promise.all(
		months.map((month) =>
			queryAnalytics({
				accessToken,
				fetcher,
				sleep,
				body: { startDate: month.startDate, endDate: month.endDate },
			}),
		),
	);

	return months.map((month, index) => {
		const row = normalizeRows(totals[index])[0];

		return {
			...month,
			clicks: row?.clicks ?? 0,
			impressions: row?.impressions ?? 0,
			ctr: row?.ctr ?? 0,
			position: row?.position ?? 0,
		};
	});
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
		// 월간 추이는 보조 지표라 따로 조회합니다. 여기서 실패해도 주간 성과는 남깁니다.
		if (report.weekly) {
			try {
				report.weekly.monthly = await readMonthlyPerformance({
					accessToken,
					months: resolveGscMonths(now),
					fetcher,
					sleep,
				});
			} catch (error) {
				report.weekly.monthly = null;
				report.failures.push({ scope: "monthly", ...safeFailure(error) });
			}
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

const INDEXED_VERDICTS = ["PASS", "PARTIAL"];
const NOT_INDEXED_VERDICTS = ["FAIL", "NEUTRAL"];

/**
 * 직전 실행과 색인 판정을 비교해 색인에서 빠진 URL과 돌아온 URL을 찾습니다.
 * @description PARTIAL은 경고가 있어도 색인된 상태라 PASS와 같이 봅니다. 판정이 없거나 이번에 조회하지 못한 URL은 비교하지 않아 조회 결함을 색인 이탈로 오보하지 않습니다.
 * 이번 조회 결과가 한 건도 없으면 비교 자체가 불가능하므로 unavailable로 표시합니다. 이탈 0건과 구분하기 위해서입니다.
 */
export const compareGscInspections = ({ currentReport, previousReport }) => {
	const changes = { baselineStatus: "compatible", dropped: [], recovered: [] };
	if (!Array.isArray(currentReport?.inspections) || currentReport.inspections.length === 0) {
		return { ...changes, baselineStatus: "unavailable" };
	}
	if (!Array.isArray(previousReport?.inspections) || previousReport.inspections.length === 0) {
		return { ...changes, baselineStatus: "missing" };
	}
	const previousByUrl = new Map(
		previousReport.inspections.map((inspection) => [inspection.url, inspection]),
	);
	for (const inspection of currentReport.inspections) {
		const previous = previousByUrl.get(inspection.url);
		if (!previous) {
			continue;
		}
		const change = {
			url: inspection.url,
			previousVerdict: previous.verdict,
			verdict: inspection.verdict,
			previousCoverageState: previous.coverageState,
			coverageState: inspection.coverageState,
		};
		if (
			INDEXED_VERDICTS.includes(previous.verdict) &&
			NOT_INDEXED_VERDICTS.includes(inspection.verdict)
		) {
			changes.dropped.push(change);
		} else if (
			NOT_INDEXED_VERDICTS.includes(previous.verdict) &&
			INDEXED_VERDICTS.includes(inspection.verdict)
		) {
			changes.recovered.push(change);
		}
	}

	return changes;
};

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
	for (const change of report.indexChanges?.dropped ?? []) {
		lines.push(`- 색인 이탈: ${change.url} (${change.previousVerdict} → ${change.verdict ?? "UNKNOWN"})`);
	}
	for (const change of report.indexChanges?.recovered ?? []) {
		lines.push(`- 색인 복귀: ${change.url} (${change.previousVerdict ?? "UNKNOWN"} → ${change.verdict})`);
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
			"| 상위 검색어 | 클릭 | 노출 | 직전 주 노출 |",
			"| --- | ---: | ---: | ---: |",
			...topQueries.map(
				(row) =>
					`| ${escapeMarkdown(row.keys[0] ?? "")} | ${row.clicks} | ${row.impressions} | ${row.previous?.impressions ?? "-"} |`,
			),
			"",
			"| 상위 페이지 | 클릭 | 노출 | 직전 주 노출 |",
			"| --- | ---: | ---: | ---: |",
			...topPages.map(
				(row) =>
					`| ${escapeMarkdown(row.keys[0] ?? "")} | ${row.clicks} | ${row.impressions} | ${row.previous?.impressions ?? "-"} |`,
			),
		);
		if (report.weekly.monthly?.length) {
			lines.push(
				"",
				"| 월 | 클릭 | 노출 | CTR | 평균 순위 |",
				"| --- | ---: | ---: | ---: | ---: |",
				...report.weekly.monthly.map(
					(month) =>
						`| ${month.month} | ${month.clicks} | ${month.impressions} | ${(month.ctr * 100).toFixed(2)}% | ${month.position.toFixed(1)} |`,
				),
			);
		}
	}

	return `${lines.join("\n")}\n`;
};
