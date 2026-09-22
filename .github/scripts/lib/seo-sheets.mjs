import { SEO_SHEET_COLUMNS } from "./seo-sheet-columns.mjs";
import { createSeoObservationMap } from "./seo-history.mjs";
/** SEO/GSC 보고서를 분석용 시트 행과 수동 변경 기록 탭으로 변환합니다. 비율은 0~1이며 분모가 없으면 빈 셀입니다. */
export const createSeoSheetTables = ({
	seoReport,
	gscReport,
	githubRunId,
	githubRunAttempt,
	commitSha = "",
	runUrl = "",
}) => {
	if (!githubRunId || !githubRunAttempt || !Array.isArray(seoReport?.pages)) {
		throw new Error("SEO Sheets requires a run ID, attempt and SEO report");
	}
	const runKey = `${githubRunId}:${githubRunAttempt}`;
	const context = [
		runKey,
		seoReport.generatedAt ?? "",
		String(githubRunId),
		String(githubRunAttempt),
	];
	const pageGroups = new Map();
	const observations = createSeoObservationMap(seoReport);
	for (const page of seoReport.pages.filter((page) => page.kind === "page")) {
		const pages = pageGroups.get(page.url) ?? [];
		pages.push(page);
		pageGroups.set(page.url, pages);
	}
	const groups = [...pageGroups.values()];
	const observedGroups = groups.filter((pages) =>
		pages.every((page) =>
			observations.get([page.kind, page.url, page.agent].join("\u001f")),
		),
	);
	const errorPageCount = groups.filter((pages) =>
		pages.some((page) =>
			page.issues.some((issue) => issue.severity === "error"),
		),
	).length;
	const warningPageCount = groups.filter((pages) =>
		pages.some((page) =>
			page.issues.some((issue) => issue.severity === "warning"),
		),
	).length;
	const healthyPageCount = observedGroups.filter((pages) =>
		pages.every((page) => page.issues.length === 0),
	).length;
	const ratio = (count) => (groups.length > 0 ? count / groups.length : "");
	const delta = seoReport.history?.delta ?? {};
	const baselineStatus = seoReport.history?.baselineStatus ?? "missing";
	const issueRows = [];
	if (baselineStatus === "compatible") {
		for (const state of ["new", "resolved", "unobservable"]) {
			for (const issue of delta[state] ?? []) {
				const issueKey =
					issue.key ??
					JSON.stringify([
						issue.kind,
						issue.url,
						issue.agent,
						issue.code,
						issue.field,
					]);
				issueRows.push([
					JSON.stringify([runKey, state, issueKey]),
					...context,
					state,
					issueKey,
					issue.kind ?? "",
					issue.url ?? "",
					issue.agent ?? "",
					issue.code ?? "",
					issue.field ?? "",
					issue.severity ?? "",
					issue.message ?? "",
				]);
			}
		}
	}
	const hasGsc = gscReport && gscReport.status !== "skipped";
	const inspections = hasGsc ? (gscReport.inspections ?? []) : [];
	const weekly = hasGsc ? gscReport.weekly : null;
	const summary = {
		key: runKey,
		generatedAt: context[1],
		githubRunId: context[2],
		githubRunAttempt: context[3],
		commitSha,
		runUrl,
		status: seoReport.errors > 0 ? "failed" : "passed",
		requestCount: seoReport.pages.length,
		pageCount: groups.length,
		observedPageCount: observedGroups.length,
		errorCount: seoReport.errors ?? 0,
		warningCount: seoReport.warnings ?? 0,
		errorPageCount,
		warningPageCount,
		healthyPageCount,
		errorPageRatio: ratio(errorPageCount),
		warningPageRatio: ratio(warningPageCount),
		healthyPageRatio: ratio(healthyPageCount),
		baselineStatus,
		newCount: delta.new?.length ?? 0,
		persistentCount: delta.persistent?.length ?? 0,
		resolvedCount: delta.resolved?.length ?? 0,
		unobservableCount: delta.unobservable?.length ?? 0,
		gscStatus: gscReport?.status ?? "missing",
		gscInspectionCount: inspections.length,
		gscFailureCount: gscReport?.failures?.length ?? 0,
		...createWeeklySummary(weekly),
	};

	return [
		{
			title: "SEO Runs",
			rows: [
				Object.keys(SEO_SHEET_COLUMNS["SEO Runs"]).map(
					(field) => summary[field],
				),
			],
		},
		{
			title: "SEO Issue Events",
			rows: issueRows,
		},
		{
			title: "GSC Index",
			rows: inspections.map((inspection) => [
				JSON.stringify([runKey, inspection.url]),
				...context,
				gscReport.generatedAt ?? "",
				gscReport.siteUrl ?? "",
				...[
					"url",
					"verdict",
					"coverageState",
					"indexingState",
					"robotsTxtState",
					"pageFetchState",
					"lastCrawlTime",
					"googleCanonical",
					"userCanonical",
				].map((field) => inspection[field] ?? ""),
			]),
		},
		{
			title: "GSC Performance",
			rows: createPerformanceRows({
				weekly,
				context,
				siteUrl: gscReport?.siteUrl ?? "",
			}),
		},
		{
			title: "SEO Changes",
			rows: [],
		},
	].map((table) => ({
		...table,
		headers: Object.values(SEO_SHEET_COLUMNS[table.title]),
		legacyHeaders: Object.keys(SEO_SHEET_COLUMNS[table.title]),
	}));
};

const createWeeklySummary = (weekly) => {
	const summary = {};
	for (const period of ["current", "previous"]) {
		for (const metric of ["clicks", "impressions", "ctr", "position"]) {
			summary[`${period}${metric[0].toUpperCase()}${metric.slice(1)}`] =
				weekly?.[period]?.[metric] ?? "";
		}
	}
	for (const metric of ["clicks", "impressions", "ctr", "position"]) {
		const current = weekly?.current?.[metric];
		const previous = weekly?.previous?.[metric];
		const isRatio = metric === "clicks" || metric === "impressions";
		let change = "";
		if (Number.isFinite(current) && Number.isFinite(previous)) {
			if (!isRatio) {
				change = current - previous;
			} else if (previous !== 0) {
				change = (current - previous) / previous;
			}
		}
		summary[`${metric}Change${isRatio ? "Ratio" : "Amount"}`] = change;
	}

	return summary;
};

const createPerformanceRows = ({ weekly, context, siteUrl }) => {
	if (!weekly) {
		return [];
	}
	const rows = [];
	const add = ({ metric, period, dimension, startDate, endDate }) => {
		if (!metric) {
			return;
		}
		const value = metric.keys?.[0] ?? "";
		rows.push([
			JSON.stringify([
				context[0],
				period,
				startDate,
				endDate,
				dimension,
				value,
			]),
			...context,
			siteUrl,
			period,
			startDate,
			endDate,
			dimension,
			value,
			metric.clicks ?? 0,
			metric.impressions ?? 0,
			metric.ctr ?? 0,
			metric.position ?? 0,
		]);
	};
	for (const period of ["current", "previous"]) {
		add({
			metric: weekly[period],
			period,
			dimension: "total",
			startDate: weekly.week[period === "current" ? "start" : "previousStart"],
			endDate: weekly.week[period === "current" ? "end" : "previousEnd"],
		});
	}
	for (const [dimension, metrics] of [
		["query", weekly.topQueries],
		["page", weekly.topPages],
	]) {
		for (const metric of metrics ?? []) {
			add({
				metric,
				period: "current",
				dimension,
				startDate: weekly.week.start,
				endDate: weekly.week.end,
			});
		}
	}

	return rows;
};
