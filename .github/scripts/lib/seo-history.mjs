/** SEO 보고서 이력을 비교할 수 있는 최소 구조인지 확인합니다. */
export const isSeoReport = (report) =>
	report !== null &&
	typeof report === "object" &&
	["string", "number"].includes(typeof report.schemaVersion) &&
	Array.isArray(report.pages);

/** 이슈의 문구가 바뀌어도 유지되는 안정 키를 만듭니다. */
export const createSeoIssueKey = ({ kind, url, agent, issue }) =>
	[kind, url, agent, issue.code, issue.field]
		.map((value) => String(value ?? ""))
		.join("\u001f");

/** JSON 문자열을 이력 비교에 사용할 보고서로 안전하게 파싱합니다. */
export const parseSeoReportJson = (value) => {
	if (!value) {
		return { baselineStatus: "missing", report: null };
	}
	try {
		const report = JSON.parse(value);

		return isSeoReport(report)
			? { baselineStatus: "compatible", report }
			: { baselineStatus: "incompatible", report: null };
	} catch {
		return { baselineStatus: "incompatible", report: null };
	}
};

/** 페이지별 이슈를 보고서 비교에 적합한 평탄한 구조로 변환합니다. */
export const flattenSeoIssues = (report) => {
	const issues = [];
	for (const page of report.pages) {
		const context = {
			kind: String(page.kind ?? "page"),
			url: String(page.url ?? ""),
			agent: String(page.agent ?? ""),
		};
		for (const issue of Array.isArray(page.issues) ? page.issues : []) {
			const item = {
				...context,
				code: String(issue.code ?? ""),
				field: String(issue.field ?? ""),
				relatedUrl: String(issue.relatedUrl ?? ""),
				relatedUrls: Array.isArray(issue.relatedUrls)
					? issue.relatedUrls.map(String)
					: [],
				severity: String(issue.severity ?? ""),
				message: String(issue.message ?? ""),
			};
			issues.push({ ...item, key: createSeoIssueKey({ ...context, issue }) });
		}
	}

	return issues;
};

/** 현재 보고서에서 페이지 요청 결과를 관측했는지 판정합니다. */
export const createSeoObservationMap = (report) =>
	new Map(
		report.pages.map((page) => {
			const scope = [page.kind ?? "page", page.url ?? "", page.agent ?? ""]
				.map(String)
				.join("\u001f");
			const isObserved =
				!page.failure &&
				page.status >= 200 &&
				page.status < 300 &&
				(page.kind !== "page" || Boolean(page.metadata));

			return [scope, isObserved];
		}),
	);

/** 이전과 현재 SEO 이슈를 신규·지속·해소·관측 불가로 분류합니다. */
export const compareSeoReports = ({ currentReport, previousReport }) => {
	const delta = { new: [], persistent: [], resolved: [], unobservable: [] };
	if (!isSeoReport(currentReport)) {
		return { baselineStatus: "incompatible", delta };
	}
	if (previousReport === null || previousReport === undefined) {
		return { baselineStatus: "missing", delta };
	}
	if (
		!isSeoReport(previousReport) ||
		previousReport.schemaVersion !== currentReport.schemaVersion
	) {
		return { baselineStatus: "incompatible", delta };
	}

	const previousByKey = new Map(
		flattenSeoIssues(previousReport).map((issue) => [issue.key, issue]),
	);
	const currentByKey = new Map(
		flattenSeoIssues(currentReport).map((issue) => [issue.key, issue]),
	);
	const observations = createSeoObservationMap(currentReport);

	for (const [key, issue] of currentByKey) {
		if (previousByKey.has(key)) {
			delta.persistent.push(issue);
		} else {
			delta.new.push(issue);
		}
	}
	for (const [key, issue] of previousByKey) {
		if (currentByKey.has(key)) {
			continue;
		}
		if (isSeoIssueObservable({ issue, observations })) {
			delta.resolved.push(issue);
		} else {
			delta.unobservable.push(issue);
		}
	}

	return { baselineStatus: "compatible", delta };
};

/**
 * 이슈별 최초 발견 시각 원장을 만듭니다. 값은 `{ firstSeenAt, exact }`입니다.
 * @description 이전 원장을 이어받고, 이번에 관측하지 못한 페이지의 이슈도 남겨 두어 요청 실패 하루로 경과 기간이 초기화되지 않게 합니다.
 * 이전 보고서가 없거나 원장이 없어 정확한 날을 모르면 알 수 있는 가장 이른 시각을 쓰고 `exact: false`로 표시합니다. 이 표시는 다음 실행으로 이어집니다.
 */
export const createFirstSeenLedger = ({ currentReport, previousReport }) => {
	const ledger = {};
	const generatedAt = currentReport.generatedAt ?? null;
	const previousLedger = isSeoReport(previousReport)
		? (previousReport.history?.firstSeen ?? {})
		: {};
	const previousKeys = isSeoReport(previousReport)
		? new Set(flattenSeoIssues(previousReport).map((issue) => issue.key))
		: null;
	const previousObservations = isSeoReport(previousReport)
		? createSeoObservationMap(previousReport)
		: new Map();
	for (const issue of flattenSeoIssues(currentReport)) {
		const scope = [issue.kind, issue.url, issue.agent].join("\u001f");
		if (previousLedger[issue.key]) {
			ledger[issue.key] = previousLedger[issue.key];
		} else if (previousKeys?.has(issue.key)) {
			ledger[issue.key] = {
				firstSeenAt: previousReport.generatedAt ?? generatedAt,
				exact: false,
			};
		} else {
			// 직전 실행이 그 페이지를 관측했는데 이슈가 없었을 때만 오늘 처음 생겼다고 확신할 수 있습니다.
			ledger[issue.key] = {
				firstSeenAt: generatedAt,
				exact: previousObservations.get(scope) === true,
			};
		}
	}
	const currentObservations = createSeoObservationMap(currentReport);
	for (const [key, entry] of Object.entries(previousLedger)) {
		const scope = key.split("\u001f").slice(0, 3).join("\u001f");
		if (!ledger[key] && currentObservations.get(scope) !== true) {
			ledger[key] = entry;
		}
	}

	return ledger;
};

/** 관계형 이슈는 판정에 필요한 모든 요청이 성공했을 때만 해소 가능하다고 봅니다. */
const isSeoIssueObservable = ({ issue, observations }) => {
	const scope = [issue.kind, issue.url, issue.agent].join("\u001f");
	if (observations.get(scope) !== true) {
		return false;
	}
	if (issue.code !== "DEVICE_METADATA_MISMATCH") {
		if (issue.code === "META_DUPLICATE_ACROSS_PAGES") {
			return (
				issue.relatedUrls.length > 0 &&
				issue.relatedUrls.every(
					(relatedUrl) =>
						observations.get(
							[issue.kind, relatedUrl, issue.agent].join("\u001f"),
						) === true,
				)
			);
		}
		if (issue.code !== "HREFLANG_RETURN_LINK_MISSING" || !issue.relatedUrl) {
			return true;
		}

		return (
			observations.get(
				[issue.kind, issue.relatedUrl, issue.agent].join("\u001f"),
			) === true
		);
	}

	return ["pc", "mobile"].every(
		(agent) =>
			observations.get([issue.kind, issue.url, agent].join("\u001f")) === true,
	);
};

/** SEO 이력 비교 결과를 GitHub 실행 요약에 표시할 Markdown으로 변환합니다. */
export const createSeoHistoryMarkdown = (history) => {
	const { delta } = history;
	const lines = [
		"## 이전 실행 비교",
		"",
		`기준선: ${history.baselineStatus}`,
		"",
	];
	if (history.baselineStatus !== "compatible") {
		const unavailableMessage =
			history.baselineStatus === "failed"
				? "이전 보고서 조회가 실패해 이번 실행에서는 회귀 여부를 판정하지 않았습니다."
				: "이전 보고서가 없거나 스키마가 달라 이번 실행에서는 회귀 여부를 판정하지 않았습니다.";
		lines.push(
			unavailableMessage,
			"",
		);

		return `${lines.join("\n")}\n`;
	}
	lines.push(
		`신규 ${delta.new.length}건 · 지속 ${delta.persistent.length}건 · 해소 ${delta.resolved.length}건 · 관측 불가 ${delta.unobservable.length}건`,
		"",
	);
	for (const issue of delta.new) {
		lines.push(
			`- 신규 [${issue.code}] ${issue.url} (${issue.agent})${issue.field ? ` · ${issue.field}` : ""}`,
		);
	}

	return `${lines.join("\n")}\n`;
};
