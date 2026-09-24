/**
 * 주간 리팩토링 점검 결과를 노션 카드와 Slack 메시지로 옮깁니다.
 *
 * 점검(claude-code-action)은 읽기 전용으로 결과만 JSON으로 냅니다. 노션·Slack 전송은
 * 이 모듈이 결정적인 코드로 맡습니다. LLM에게 쓰기 권한을 주지 않으려는 분리입니다.
 */

import { requestJson } from "../shared/http.mjs";

/**
 * 카드 한 장에 싣는 발견 수의 상한. 넘치면 우선순위가 낮은 것부터 잘립니다.
 *
 * 노션은 페이지 생성 때 children을 100블록까지만 받습니다. 최악의 경우 발견 하나가
 * 제목 1 + 위치 5 + 문제 1 + 제안 1 = 8블록이고 고정 블록이 8개라, 10건이면 88블록입니다.
 * 이 상수나 파일 수 상한(normalizeFinding의 slice)을 올리면 100을 넘어 400이 납니다.
 */
const MAX_FINDINGS = 10;

/** 노션 rich_text 한 조각의 상한은 2000자입니다. 여유를 두고 자릅니다. */
const MAX_TEXT_LENGTH = 1800;

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

const SEVERITY_LABELS = { high: "높음", medium: "중간", low: "낮음" };

const CATEGORY_LABELS = { design: "설계", structure: "구조", quality: "퀄리티" };

const NOTION_API_URL = "https://api.notion.com/v1";

/** 자동 점검 카드를 사람이 만든 카드와 가르는 제목 표식. 중복 방지 조회도 이 문자열로 찾습니다. */
const AUDIT_TITLE_MARKER = "(주간 자동)";

/** database_id 부모를 받는 마지막 안정 버전입니다. 새 버전은 data_source_id를 요구합니다. */
const NOTION_VERSION = "2022-06-28";

const notionHeaders = (token) => ({
	authorization: `Bearer ${token}`,
	"notion-version": NOTION_VERSION,
	"content-type": "application/json",
});

const truncate = (value, limit = MAX_TEXT_LENGTH) => {
	const text = typeof value === "string" ? value.trim() : "";

	return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

const normalizeFinding = (raw) => ({
	title: truncate(raw?.title, 200),
	severity: Object.hasOwn(SEVERITY_ORDER, raw?.severity) ? raw.severity : "low",
	category: Object.hasOwn(CATEGORY_LABELS, raw?.category) ? raw.category : "quality",
	files: Array.isArray(raw?.files)
		? raw.files.map((file) => truncate(file, 200)).filter(Boolean).slice(0, 5)
		: [],
	problem: truncate(raw?.problem),
	suggestion: truncate(raw?.suggestion),
});

/**
 * claude-code-action의 structured_output(JSON 문자열 또는 객체)을 카드에 쓸 모양으로 다듬습니다.
 *
 * 모델 출력이라 스키마를 믿지 않습니다. 제목이 빈 항목은 버리고, 심각도 순으로 정렬해
 * 상한만큼만 남깁니다. 파싱할 수 없으면 던집니다 — 빈 결과로 넘기면 "발견 없음"으로 오인됩니다.
 */
export const normalizeAudit = (raw) => {
	const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

	if (!parsed || !Array.isArray(parsed.findings)) {
		throw new Error("점검 결과에 findings 배열이 없습니다");
	}

	const findings = parsed.findings
		.map(normalizeFinding)
		.filter((finding) => finding.title !== "")
		.sort(
			(left, right) =>
				SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity],
		);

	return {
		summary: truncate(parsed.summary),
		findings: findings.slice(0, MAX_FINDINGS),
		omittedCount: Math.max(0, findings.length - MAX_FINDINGS),
	};
};

const text = (content) => [{ type: "text", text: { content } }];

const heading = (type, content) => ({
	object: "block",
	type,
	[type]: { rich_text: text(content) },
});

const paragraph = (content) => ({
	object: "block",
	type: "paragraph",
	paragraph: { rich_text: text(content) },
});

const bullet = (content) => ({
	object: "block",
	type: "bulleted_list_item",
	bulleted_list_item: { rich_text: text(content) },
});

const describeFinding = (finding, index) => [
	heading(
		"heading_3",
		`${index + 1}. [${SEVERITY_LABELS[finding.severity]} · ${CATEGORY_LABELS[finding.category]}] ${finding.title}`,
	),
	...finding.files.map((file) => bullet(`위치: ${file}`)),
	...(finding.problem ? [bullet(`문제: ${finding.problem}`)] : []),
	...(finding.suggestion ? [bullet(`제안: ${finding.suggestion}`)] : []),
];

/**
 * 개인 업무 로그 DB에 만들 페이지 본문입니다.
 *
 * 본문 골격은 /gs 스킬이 읽는 모양(# 인간 작성 / # AI 작성)을 따릅니다. 사람 자리는 비워 두고
 * 점검 결과는 AI 작성 아래에만 씁니다. 시작 단계를 "논의"로 두는 것은 비워 두면 러너가 기획 단계로
 * 읽기 때문입니다.
 */
export const buildNotionPage = ({ databaseId, audit, dateLabel, runUrl }) => ({
	parent: { database_id: databaseId },
	properties: {
		이름: { title: text(`코드 점검 ${dateLabel} ${AUDIT_TITLE_MARKER}`) },
		프로젝트: { select: { name: "웹 메모" } },
		"시작 단계": { select: { name: "논의" } },
		"작업 시작 날짜": { date: { start: dateLabel } },
	},
	children: [
		heading("heading_1", "인간 작성"),
		heading("heading_3", "기획"),
		heading("heading_3", "설계"),
		heading("heading_1", "AI 작성"),
		heading("heading_2", "점검 결과"),
		...(audit.summary ? [paragraph(audit.summary)] : []),
		...audit.findings.flatMap(describeFinding),
		...(audit.omittedCount > 0
			? [paragraph(`상한(${MAX_FINDINGS}건)을 넘어 ${audit.omittedCount}건은 싣지 않았습니다.`)]
			: []),
		...(runUrl ? [paragraph(`점검 실행: ${runUrl}`)] : []),
	],
});

/**
 * 앞 회차에 만든 점검 카드가 아직 열려 있으면 그 URL을, 없으면 null을 돌려줍니다.
 *
 * 열림의 기준은 상태가 "완료"가 아닌 것입니다. 사람이 손대지 않은 같은 발견이 매주 새 카드로
 * 쌓이면 진짜 카드가 묻히므로, 열린 카드가 있으면 이번 회차는 카드를 만들지 않습니다.
 * cleanup-unused-files.mjs 가 열린 PR이 있으면 회차를 건너뛰는 것과 같은 이유입니다.
 */
export const findOpenAuditCard = async ({ token, databaseId }) => {
	const result = await requestJson(`${NOTION_API_URL}/databases/${databaseId}/query`, {
		method: "POST",
		headers: notionHeaders(token),
		body: JSON.stringify({
			filter: {
				and: [
					{ property: "이름", title: { contains: AUDIT_TITLE_MARKER } },
					{ property: "프로젝트", select: { equals: "웹 메모" } },
					{ property: "상태", status: { does_not_equal: "완료" } },
				],
			},
			page_size: 1,
		}),
	});

	return result.results[0]?.url ?? null;
};

/** 노션 페이지를 만들고 그 URL을 돌려줍니다. */
export const createNotionCard = async ({ token, page }) => {
	const created = await requestJson(`${NOTION_API_URL}/pages`, {
		method: "POST",
		headers: notionHeaders(token),
		body: JSON.stringify(page),
	});

	return created.url;
};

/** Slack에는 요약과 카드 링크만 보냅니다. 상세는 카드가 원천입니다. */
export const buildSlackPayload = ({ audit, cardUrl, openCardUrl = null, runUrl }) => {
	if (audit.findings.length === 0) {
		return { text: "🔍 주간 코드 점검: 이번 주에는 리팩토링할 부분을 찾지 못했습니다." };
	}

	const total = audit.findings.length + audit.omittedCount;

	// 앞 카드가 열려 있어 이번에는 카드를 만들지 않은 회차입니다. 발견 수만 알리고 열린 카드로 안내합니다.
	if (openCardUrl) {
		return {
			text: `🔍 주간 코드 점검: 리팩토링 후보 ${total}건 (이전 카드가 열려 있어 새 카드는 만들지 않았습니다)`,
			blocks: [
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `*🔍 주간 코드 점검: 리팩토링 후보 ${total}건*\n이전 점검 카드가 아직 열려 있어 새 카드는 만들지 않았습니다. <${openCardUrl}|열린 카드 보기>`,
					},
				},
			],
		};
	}

	const top = audit.findings
		.slice(0, 3)
		.map((finding) => `• [${SEVERITY_LABELS[finding.severity]}] ${finding.title}`)
		.join("\n");
	const links = [
		cardUrl ? `<${cardUrl}|노션 카드 보기>` : null,
		runUrl ? `<${runUrl}|실행 로그>` : null,
	]
		.filter(Boolean)
		.join(" · ");

	return {
		text: `🔍 주간 코드 점검: 리팩토링 후보 ${total}건`,
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `*🔍 주간 코드 점검: 리팩토링 후보 ${total}건*\n${top}${links ? `\n${links}` : ""}`,
				},
			},
		],
	};
};
