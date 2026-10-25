/**
 * SEO·GSC 보고서를 AI 리포트의 입력으로 가공합니다.
 *
 * AI는 이 파일에 담긴 사실만 해석합니다. 증감률·경과 일수처럼 계산이 필요한 값은
 * 여기서 미리 계산해 모델이 산술을 틀리지 않게 합니다. 발견 사항은 여기서 부여한
 * evidenceId를 인용해야 하며, 목록에 없는 id를 인용한 발견은 발송 단계에서 버립니다.
 */

const MAX_AFFECTED_PER_GROUP = 20;
const MAX_COMMITS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const ratioChange = (current, previous) =>
	Number.isFinite(current) && Number.isFinite(previous) && previous !== 0
		? (current - previous) / previous
		: null;

const amountChange = (current, previous) =>
	Number.isFinite(current) && Number.isFinite(previous) ? current - previous : null;

const ageInDays = (firstSeenAt, now) => {
	const time = Date.parse(firstSeenAt ?? "");

	return Number.isFinite(time) ? Math.max(0, Math.floor((now - time) / DAY_MS)) : null;
};

/** 같은 코드·필드의 이슈를 한 묶음으로 만듭니다. 경고 100건이 대개 몇 가지 원인에서 나오기 때문입니다. */
const groupSeoIssues = ({ seoReport, now }) => {
	const history = seoReport.history ?? {};
	const isComparable = history.baselineStatus === "compatible";
	const newKeys = new Set((history.delta?.new ?? []).map((issue) => issue.key));
	const ledger = history.firstSeen ?? {};
	const groups = new Map();
	for (const page of seoReport.pages ?? []) {
		for (const issue of page.issues ?? []) {
			const key = [page.kind ?? "page", page.url ?? "", page.agent ?? "", issue.code, issue.field]
				.map((value) => String(value ?? ""))
				.join("\u001f");
			const id = `seo:${issue.code}:${issue.field || "-"}`;
			const group = groups.get(id) ?? {
				id,
				severity: issue.severity,
				code: issue.code,
				field: issue.field ?? "",
				messages: [],
				affected: [],
				affectedCount: 0,
				statusCounts: { new: 0, persistent: 0, unknown: 0 },
				earliestFirstSeenAt: null,
				firstSeenExact: true,
			};
			if (issue.severity === "error") {
				group.severity = "error";
			}
			if (group.messages.length < 3 && !group.messages.includes(issue.message)) {
				group.messages.push(issue.message);
			}
			group.affectedCount += 1;
			if (group.affected.length < MAX_AFFECTED_PER_GROUP) {
				group.affected.push({ url: page.url, agent: page.agent, kind: page.kind });
			}
			if (!isComparable) {
				group.statusCounts.unknown += 1;
			} else if (newKeys.has(key)) {
				group.statusCounts.new += 1;
			} else {
				group.statusCounts.persistent += 1;
			}
			const entry = ledger[key];
			if (!entry) {
				group.firstSeenExact = false;
			} else {
				if (!entry.exact) {
					group.firstSeenExact = false;
				}
				if (!group.earliestFirstSeenAt || entry.firstSeenAt < group.earliestFirstSeenAt) {
					group.earliestFirstSeenAt = entry.firstSeenAt;
				}
			}
			groups.set(id, group);
		}
	}

	return [...groups.values()]
		.map((group) => ({
			...group,
			ageDays: ageInDays(group.earliestFirstSeenAt, now),
		}))
		.sort((left, right) =>
			left.severity === right.severity
				? right.affectedCount - left.affectedCount
				: left.severity === "error"
					? -1
					: 1,
		);
};

const groupResolvedIssues = (seoReport) => {
	if (seoReport.history?.baselineStatus !== "compatible") {
		return [];
	}
	const groups = new Map();
	for (const issue of seoReport.history.delta?.resolved ?? []) {
		const id = `seo-resolved:${issue.code}:${issue.field || "-"}`;
		const group = groups.get(id) ?? { id, code: issue.code, field: issue.field, urls: [] };
		if (!group.urls.includes(issue.url)) {
			group.urls.push(issue.url);
		}
		groups.set(id, group);
	}

	return [...groups.values()];
};

/**
 * 검색어는 외부 사용자가 입력한 문자열이라 모델에 넘기기 전에 제어 문자를 지우고 길이를 줄입니다.
 * 지시문을 심은 검색어가 들어와도 모델 출력은 발송 단계에서 다시 검증합니다.
 */
const sanitizeExternalText = (value) =>
	String(value ?? "")
		.replace(/\p{Cc}/gu, " ")
		.trim()
		.slice(0, 100);

const describeRankedRows = (rows, name) =>
	(rows ?? []).map((row) => {
		const value = sanitizeExternalText(row.keys?.[0]);

		return {
			id: `gsc:${name}:${value}`,
			[name]: value,
			clicks: row.clicks,
			impressions: row.impressions,
			ctr: row.ctr,
			position: row.position,
			previousImpressions: row.previous?.impressions ?? null,
			impressionsChangeRatio: row.previous
				? ratioChange(row.impressions, row.previous.impressions)
				: null,
			// 순위는 숫자가 작을수록 좋습니다. 양수면 개선입니다.
			positionImprovement: row.previous ? amountChange(row.previous.position, row.position) : null,
		};
	});

const describeGsc = (gscReport) => {
	if (!gscReport) {
		return { status: "missing" };
	}
	const inspections = gscReport.inspections ?? [];
	const byVerdict = {};
	for (const inspection of inspections) {
		const verdict = inspection.verdict ?? "UNKNOWN";
		byVerdict[verdict] = (byVerdict[verdict] ?? 0) + 1;
	}
	const indexChanges = gscReport.indexChanges ?? { baselineStatus: "missing", dropped: [], recovered: [] };
	const weekly = gscReport.weekly;

	return {
		status: gscReport.status,
		reason: gscReport.reason ?? null,
		failures: (gscReport.failures ?? []).map((failure) => ({
			scope: failure.url ? "url" : failure.scope,
			code: failure.code,
		})),
		inspections: {
			total: inspections.length,
			byVerdict,
			notIndexed: inspections
				.filter((inspection) => !["PASS", "PARTIAL"].includes(inspection.verdict))
				.map((inspection) => ({
					id: `gsc:not-indexed:${inspection.url}`,
					url: inspection.url,
					verdict: inspection.verdict,
					coverageState: inspection.coverageState,
					lastCrawlTime: inspection.lastCrawlTime,
				})),
		},
		indexChanges: {
			baselineStatus: indexChanges.baselineStatus,
			dropped: (indexChanges.dropped ?? []).map((change) => ({
				id: `gsc:index-dropped:${change.url}`,
				...change,
			})),
			recovered: (indexChanges.recovered ?? []).map((change) => ({
				id: `gsc:index-recovered:${change.url}`,
				...change,
			})),
		},
		weekly: weekly
			? {
					id: "gsc:weekly-totals",
					period: weekly.week,
					totals: Object.fromEntries(
						["clicks", "impressions", "ctr", "position"].map((metric) => [
							metric,
							{
								current: weekly.current?.[metric] ?? null,
								previous: weekly.previous?.[metric] ?? null,
								...(metric === "clicks" || metric === "impressions"
									? { changeRatio: ratioChange(weekly.current?.[metric], weekly.previous?.[metric]) }
									: { changeAmount: amountChange(weekly.current?.[metric], weekly.previous?.[metric]) }),
							},
						]),
					),
					topQueries: describeRankedRows(weekly.topQueries, "query"),
					topPages: describeRankedRows(weekly.topPages, "page"),
					monthly: weekly.monthly
						? { id: "gsc:monthly", months: weekly.monthly }
						: null,
				}
			: null,
	};
};

const collectEvidenceIds = ({ issueGroups, resolvedGroups, gsc }) => [
	...issueGroups.map((group) => group.id),
	...resolvedGroups.map((group) => group.id),
	...(gsc.inspections?.notIndexed ?? []).map((item) => item.id),
	...(gsc.indexChanges?.dropped ?? []).map((item) => item.id),
	...(gsc.indexChanges?.recovered ?? []).map((item) => item.id),
	...(gsc.weekly ? [gsc.weekly.id] : []),
	...(gsc.weekly?.topQueries ?? []).map((row) => row.id),
	...(gsc.weekly?.topPages ?? []).map((row) => row.id),
	...(gsc.weekly?.monthly ? [gsc.weekly.monthly.id] : []),
];

/**
 * AI 리포트 입력을 만듭니다.
 * @description GSC 주간 성과가 있으면 주간 리포트, 없으면 일일 리포트로 표시합니다. evidenceIds는 발견 사항이 인용할 수 있는 근거의 전체 목록입니다.
 */
export const createSeoAiContext = ({ seoReport, gscReport = null, commits = [], now = new Date() }) => {
	const issueGroups = groupSeoIssues({ seoReport, now: now.getTime() });
	const resolvedGroups = groupResolvedIssues(seoReport);
	const gsc = describeGsc(gscReport);

	return {
		generatedAt: now.toISOString(),
		reportDate: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now),
		mode: gsc.weekly ? "weekly" : "daily",
		site: "https://www.webmemo.xyz",
		seo: {
			errors: seoReport.errors ?? 0,
			warnings: seoReport.warnings ?? 0,
			requestCount: seoReport.pages?.length ?? 0,
			baselineStatus: seoReport.history?.baselineStatus ?? "missing",
			issueGroups,
			resolvedGroups,
			unobservableCount: seoReport.history?.delta?.unobservable?.length ?? 0,
		},
		gsc,
		commits: commits.slice(0, MAX_COMMITS),
		evidenceIds: collectEvidenceIds({ issueGroups, resolvedGroups, gsc }),
	};
};

/**
 * `git log --pretty=format:%h%x1f%cI%x1f%s --name-only` 출력을 커밋 목록으로 바꿉니다.
 * @description 커밋마다 헤더 한 줄 뒤에 파일 목록이 오고, 커밋 사이는 빈 줄로 구분됩니다.
 */
export const parseGitLog = (output) =>
	output
		.split(/\n\s*\n/)
		.map((block) => block.split("\n").filter(Boolean))
		.filter((lines) => lines.length > 0 && lines[0].includes("\u001f"))
		.map(([header, ...files]) => {
			const [sha, date, subject] = header.split("\u001f");

			return { sha, date, subject, files: files.slice(0, 20) };
		});
