/**
 * claude-code-action이 낸 SEO 리포트(JSON)를 검증하고 Slack·Markdown으로 렌더링합니다.
 *
 * 모델 출력이라 스키마를 믿지 않습니다. 발견 사항은 입력(ai-context.json)에 있는 evidenceId를
 * 하나 이상 인용해야 남깁니다. 이 검증은 "근거로 댄 대상이 입력에 실제로 있는가"까지만 봅니다.
 * 대상은 실재하는데 해석이 틀린 경우는 거르지 못하므로, 근거 id를 이슈 묶음·검색어·페이지 단위로
 * 잘게 나눠 인용 범위를 좁혔습니다.
 *
 * 입력의 검색어는 외부 사용자가 입력한 문자열이라 모델이 지시문에 끌려갈 수 있습니다. 그래서
 * 모델이 쓴 문장은 Slack 제어 문자를 이스케이프하고 자동 멘션·링크를 끈 채(verbatim) 내보내며,
 * 토큰처럼 보이는 문자열이 섞인 필드는 통째로 지웁니다.
 */

/** 스레드 한 메시지에 싣는 발견 수입니다. Slack 메시지는 블록 50개까지라 발견당 2블록으로 여유를 둡니다. */
const MAX_SLACK_FINDINGS = 8;
const MAX_LIST_ITEMS = 6;
const MAX_CODE_REFS = 5;
/** Slack section text 상한은 3000자입니다. 이스케이프로 늘어날 여유를 둡니다. */
const MAX_SECTION_LENGTH = 2800;

const PRIORITIES = ["P0", "P1", "P2", "P3"];
const PRIORITY_LABELS = { P0: "🚨 P0", P1: "⚠️ P1", P2: "📋 P2", P3: "💡 P3" };
const STATUS_ORDER = ["good", "warning", "critical"];
const STATUS_EMOJI = { good: "🟢", warning: "🟡", critical: "🔴" };

/** 러너 환경에 있을 수 있는 자격 증명 형식입니다. 모델 출력에 섞이면 유출로 봅니다. */
const SECRET_PATTERN =
	/(?:gh[pousr]_|github_pat_|xox[abpors]-|sk-ant-|AIza)[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/;
const REDACTED_TEXT = "[민감 정보로 보여 삭제함]";

const truncate = (value, limit) => {
	const text = typeof value === "string" ? value.trim() : "";

	return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

/** 모델이 쓴 문자열을 자르고, 자격 증명처럼 보이면 통째로 바꿉니다. */
const cleanModelText = (value, limit) => {
	const text = typeof value === "string" ? value : "";

	return SECRET_PATTERN.test(text) ? REDACTED_TEXT : truncate(text, limit);
};

const toList = (value, limit, itemLimit = 300) =>
	(Array.isArray(value) ? value : [])
		.map((item) => cleanModelText(item, itemLimit))
		.filter(Boolean)
		.slice(0, limit);

/** 입력 사실만으로 정해지는 최소 상태입니다. 모델이 이보다 낙관적으로 쓰면 이 값으로 올립니다. */
const resolveMinimumStatus = (context) => {
	if ((context.seo?.errors ?? 0) > 0) {
		return "critical";
	}
	const hasNewIssue = (context.seo?.issueGroups ?? []).some((group) => group.statusCounts?.new > 0);
	const hasIndexDrop = (context.gsc?.indexChanges?.dropped ?? []).length > 0;

	return hasNewIssue || hasIndexDrop ? "warning" : "good";
};

const normalizeFinding = ({ raw, evidenceIds, fileExists }) => {
	// 먼저 거르고 나중에 자릅니다. 반대로 하면 뒤쪽의 유효한 id가 잘려 발견이 통째로 버려집니다.
	const citedIds = (Array.isArray(raw?.evidenceIds) ? raw.evidenceIds : [])
		.filter((id) => typeof id === "string" && evidenceIds.has(id))
		.slice(0, 10);
	const codeRefs = (Array.isArray(raw?.codeRefs) ? raw.codeRefs : [])
		.map((ref) => cleanModelText(ref, 200))
		.filter((ref) => ref && ref !== REDACTED_TEXT && fileExists(ref.replace(/:\d+(?:-\d+)?$/, "")))
		.slice(0, MAX_CODE_REFS);

	return {
		priority: PRIORITIES.includes(raw?.priority) ? raw.priority : "P3",
		title: cleanModelText(raw?.title, 150),
		impact: cleanModelText(raw?.impact, 700),
		evidence: cleanModelText(raw?.evidence, 500),
		suggestion: cleanModelText(raw?.suggestion, 700),
		codeRefs,
		evidenceIds: citedIds,
	};
};

/**
 * 모델 출력을 발송할 모양으로 다듬습니다.
 * @description 근거 id가 없는 발견과 저장소에 없는 파일 참조는 버리고, 버린 발견 수를 droppedFindingCount로 남깁니다. 파싱할 수 없으면 던집니다. 빈 리포트로 넘기면 "문제 없음"으로 오인되기 때문입니다.
 */
export const normalizeSeoAiReport = ({ raw, context, fileExists = () => true }) => {
	const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
	if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.findings)) {
		throw new Error("AI 리포트에 findings 배열이 없습니다");
	}
	const evidenceIds = new Set(context.evidenceIds ?? []);
	const findings = parsed.findings.map((finding) =>
		normalizeFinding({ raw: finding, evidenceIds, fileExists }),
	);
	const validFindings = findings
		.filter((finding) => finding.title && finding.evidenceIds.length > 0)
		.sort((left, right) => PRIORITIES.indexOf(left.priority) - PRIORITIES.indexOf(right.priority));
	const modelStatus = STATUS_ORDER.includes(parsed.status) ? parsed.status : "warning";
	const minimumStatus = resolveMinimumStatus(context);

	return {
		mode: context.mode,
		reportDate: context.reportDate,
		status:
			STATUS_ORDER.indexOf(modelStatus) >= STATUS_ORDER.indexOf(minimumStatus)
				? modelStatus
				: minimumStatus,
		headline: cleanModelText(parsed.headline, 600),
		situation: {
			good: toList(parsed.situation?.good, MAX_LIST_ITEMS),
			concerns: toList(parsed.situation?.concerns, MAX_LIST_ITEMS),
		},
		findings: validFindings,
		roadmap: (Array.isArray(parsed.roadmap) ? parsed.roadmap : [])
			.map((item) => ({ when: cleanModelText(item?.when, 40), action: cleanModelText(item?.action, 300) }))
			.filter((item) => item.when && item.action)
			.slice(0, 5),
		droppedFindingCount: findings.length - validFindings.length,
	};
};

/** 우선순위별 발견 수입니다. */
export const countFindingsByPriority = (report) =>
	Object.fromEntries(
		PRIORITIES.map((priority) => [
			priority,
			report.findings.filter((finding) => finding.priority === priority).length,
		]),
	);

const escapeSlack = (value) =>
	String(value).replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]);

// verbatim 을 켜야 평문 URL·@here 같은 표기가 자동으로 링크·멘션되지 않습니다.
// 직접 쓴 <url|이름> 형식은 verbatim 에서도 링크로 표시됩니다.
const section = (text) => ({
	type: "section",
	text: { type: "mrkdwn", text: truncate(text, MAX_SECTION_LENGTH), verbatim: true },
});

const createTitle = (report) =>
	`${STATUS_EMOJI[report.status]} Web Memo SEO ${report.mode === "weekly" ? "주간" : "일일"} 리포트 — ${report.reportDate}`;

const formatSeoFacts = (context) => {
	const facts = [`오류 ${context.seo.errors}건 · 경고 ${context.seo.warnings}건`];
	const inspections = context.gsc?.inspections;
	if (inspections?.total > 0) {
		facts.push(`색인 ${inspections.total - inspections.notIndexed.length}/${inspections.total}개 지면`);
	}
	const totals = context.gsc?.weekly?.totals;
	if (totals) {
		const change = totals.clicks.changeRatio;
		facts.push(
			`주간 클릭 ${totals.clicks.current ?? 0}회${Number.isFinite(change) ? ` (${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}%)` : ""}`,
		);
	}

	return facts.join(" · ");
};

/** 채널 본문 메시지입니다. 상태·한 줄 요약·건수만 싣고 상세는 스레드로 보냅니다. */
export const buildSeoAiRootPayload = ({ report, context, runUrl }) => {
	const counts = countFindingsByPriority(report);
	const countLine = PRIORITIES.map((priority) => `${PRIORITY_LABELS[priority]} *${counts[priority]}건*`).join("  ");
	const link = runUrl ? `\n<${runUrl}|GitHub Actions 실행 결과>` : "";

	return {
		text: escapeSlack(`${createTitle(report)}: ${report.headline}`),
		blocks: [
			section(`*${createTitle(report)}*\n\n> ${escapeSlack(report.headline)}`),
			section(`${countLine}\n${formatSeoFacts(context)}\n\n💬 상세 내용은 스레드를 확인하세요${link}`),
		],
	};
};

/** 섹션 한도를 넘으면 코드 위치부터 줄여 본문 문장이 중간에서 잘리지 않게 합니다. */
const describeFinding = (finding) => {
	const lines = [`*${PRIORITY_LABELS[finding.priority]}  |  ${escapeSlack(finding.title)}*`];
	if (finding.impact) {
		lines.push(escapeSlack(finding.impact));
	}
	if (finding.evidence) {
		lines.push(`_📎 ${escapeSlack(finding.evidence)}_`);
	}
	if (finding.suggestion) {
		lines.push(`*수정 방법* ${escapeSlack(finding.suggestion)}`);
	}
	const body = lines.join("\n");
	for (let count = finding.codeRefs.length; count > 0; count -= 1) {
		const refs = `코드: ${finding.codeRefs.slice(0, count).map((ref) => `\`${escapeSlack(ref)}\``).join(" ")}`;
		if (body.length + refs.length + 1 <= MAX_SECTION_LENGTH) {
			return `${body}\n${refs}`;
		}
	}

	return body;
};

/** 스레드 댓글 메시지 목록입니다. 상황 → 발견 사항 → 로드맵 순서입니다. */
export const buildSeoAiThreadPayloads = ({ report }) => {
	const payloads = [];
	// 잘 되는 점과 우려되는 점을 다른 섹션에 둬야 길어져도 우려되는 점이 잘리지 않습니다.
	const situationBlocks = [section("*📌 지금 어떤 상황인가요?*")];
	if (report.situation.good.length > 0) {
		situationBlocks.push(
			section(["*잘 되고 있는 점*", ...report.situation.good.map((item) => `✓ ${escapeSlack(item)}`)].join("\n")),
		);
	}
	if (report.situation.concerns.length > 0) {
		situationBlocks.push(
			section(["*우려되는 점*", ...report.situation.concerns.map((item) => `✗ ${escapeSlack(item)}`)].join("\n")),
		);
	}
	payloads.push({ text: "지금 어떤 상황인가요?", blocks: situationBlocks });

	const displayedFindings = report.findings.slice(0, MAX_SLACK_FINDINGS);
	const omittedCount = report.findings.length - displayedFindings.length;
	const findingBlocks =
		displayedFindings.length > 0
			? displayedFindings.flatMap((finding) => [section(describeFinding(finding)), { type: "divider" }])
			: [section("발견된 문제가 없습니다.")];
	if (omittedCount > 0) {
		findingBlocks.push(section(`나머지 ${omittedCount}건은 실행 아티팩트의 ai-report.md에서 확인할 수 있습니다.`));
	}
	payloads.push({
		text: "발견된 문제 상세",
		blocks: [section("*🔍 발견된 문제 상세*"), ...findingBlocks],
	});

	if (report.roadmap.length > 0) {
		payloads.push({
			text: "개선 로드맵",
			blocks: [
				section(
					["*🗺 개선 로드맵*", "", ...report.roadmap.map((item) => `*${escapeSlack(item.when)}* ${escapeSlack(item.action)}`)].join("\n"),
				),
			],
		});
	}

	return payloads;
};

/** 아티팩트로 보관할 Markdown입니다. Slack에서 잘린 항목까지 모두 담습니다. */
export const createSeoAiMarkdown = ({ report, context }) => {
	const counts = countFindingsByPriority(report);
	const lines = [
		`# ${createTitle(report)}`,
		"",
		`> ${report.headline}`,
		"",
		PRIORITIES.map((priority) => `${priority} ${counts[priority]}건`).join(" · "),
		"",
		formatSeoFacts(context),
		"",
		"## 지금 어떤 상황인가요?",
		"",
		...report.situation.good.map((item) => `- ✓ ${item}`),
		...report.situation.concerns.map((item) => `- ✗ ${item}`),
		"",
		"## 발견된 문제 상세",
		"",
	];
	for (const finding of report.findings) {
		lines.push(
			`### ${finding.priority} · ${finding.title}`,
			"",
			finding.impact,
			"",
			`근거: ${finding.evidence} (${finding.evidenceIds.join(", ")})`,
			"",
			`수정 방법: ${finding.suggestion}`,
			"",
		);
		if (finding.codeRefs.length > 0) {
			lines.push(`코드: ${finding.codeRefs.map((ref) => `\`${ref}\``).join(" ")}`, "");
		}
	}
	if (report.findings.length === 0) {
		lines.push("발견된 문제가 없습니다.", "");
	}
	if (report.roadmap.length > 0) {
		lines.push("## 개선 로드맵", "", ...report.roadmap.map((item) => `- **${item.when}** ${item.action}`), "");
	}
	if (report.droppedFindingCount > 0) {
		lines.push(`_근거를 인용하지 않아 제외한 AI 발견 ${report.droppedFindingCount}건_`, "");
	}

	return `${lines.join("\n")}\n`;
};
