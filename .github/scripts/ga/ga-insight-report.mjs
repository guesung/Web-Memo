/**
 * AI 가 쓴 GA 인사이트(JSON)를 검증하고 Slack 스레드 댓글 페이로드로 조립합니다.
 *
 * 모델 출력은 그대로 내보내지 않습니다. 형태가 맞는 항목만 남기고, 길이를 자르고,
 * 멘션 문법을 지운 뒤에만 나갑니다. 모델에게는 Slack 쓰기 권한이 없고, 이 모듈을 거친
 * 결과만 send-ga-insight.mjs 가 봇으로 보냅니다.
 */

const TITLE_LIMIT = 150;
const DETAIL_LIMIT = 1200;
const ACTION_LIMIT = 500;
const SUMMARY_LIMIT = 600;
const CAVEAT_LIMIT = 300;
const MAX_CAVEATS = 4;

/** 일일 인사이트는 3~5개를 요구합니다. 더 오면 앞의 5개만 씁니다. */
const MAX_DAILY_INSIGHTS = 5;

/** 주간 각 부분에 펼칠 항목 수. Slack 메시지 한 건의 블록 한도(50)를 넘지 않게 합니다. */
const MAX_SECTION_ITEMS = 5;

/** 주간 인사이트의 네 부분. 순서가 곧 댓글에 나오는 순서입니다. */
export const WEEKLY_SECTIONS = [
	{ key: "trend", heading: "① 추이" },
	{ key: "impact", heading: "② 가장 임팩트가 컸던 것" },
	{ key: "improvements", heading: "③ 보완해야 할 것" },
	{ key: "removalCandidates", heading: "④ 제거(정리)를 검토해도 될 기능" },
];

/**
 * 서비스 계정 키처럼 보이는 문자열. 모델 입력에는 GA 조회용 자격 증명이 환경변수로
 * 있으므로, 출력에 그 조각이 섞였다면 내보내지 않고 통째로 버립니다.
 */
const SECRET_PATTERN = /BEGIN [A-Z ]*PRIVATE KEY|"private_key"|private_key_id/;

/**
 * 모델이 쓴 글에서 Slack 이 특별하게 해석하는 멘션 문법을 지웁니다.
 * <!channel>·<!here>·<@U…>·<!subteam^…> 이 그대로 나가면 채널 전체를 호출합니다.
 */
const stripMentions = (text) => text.replace(/<[!@][^>]*>/g, "");

const cleanText = (value, limit) => {
	if (typeof value !== "string") return "";

	const text = stripMentions(value).trim();

	return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

/** 제목과 본문이 모두 있는 항목만 남깁니다. 행동 제안은 없어도 됩니다. */
const normalizeItems = (items, limit) =>
	(Array.isArray(items) ? items : [])
		.map((item) => ({
			title: cleanText(item?.title, TITLE_LIMIT),
			detail: cleanText(item?.detail, DETAIL_LIMIT),
			action: cleanText(item?.action, ACTION_LIMIT),
		}))
		.filter(({ title, detail }) => title && detail)
		.slice(0, limit);

const normalizeCaveats = (caveats) =>
	(Array.isArray(caveats) ? caveats : [])
		.map((caveat) => cleanText(caveat, CAVEAT_LIMIT))
		.filter(Boolean)
		.slice(0, MAX_CAVEATS);

/**
 * 모델 출력(JSON 문자열)을 검증해 보낼 수 있는 형태로 바꿉니다.
 *
 * @param {object} params
 * @param {string} params.raw claude-code-action 의 structured_output
 * @param {"daily" | "weekly"} params.kind
 * @throws 해석할 수 없거나, 남는 항목이 하나도 없거나, 자격 증명처럼 보이는 문자열이 섞였으면 던집니다.
 */
export const normalizeGaInsight = ({ raw, kind }) => {
	if (SECRET_PATTERN.test(raw)) {
		throw new Error("출력에 자격 증명으로 보이는 문자열이 있어 보내지 않습니다");
	}

	const parsed = JSON.parse(raw);

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("인사이트 결과가 객체가 아닙니다");
	}

	const summary = cleanText(parsed.summary, SUMMARY_LIMIT);
	const caveats = normalizeCaveats(parsed.caveats);

	if (kind === "daily") {
		const insights = normalizeItems(parsed.insights, MAX_DAILY_INSIGHTS);

		if (insights.length === 0) {
			throw new Error("보낼 수 있는 인사이트가 없습니다");
		}

		return { kind, summary, insights, caveats };
	}

	const sections = WEEKLY_SECTIONS.map(({ key, heading }) => ({
		heading,
		items: normalizeItems(parsed[key], MAX_SECTION_ITEMS),
	})).filter(({ items }) => items.length > 0);

	if (sections.length === 0) {
		throw new Error("보낼 수 있는 인사이트가 없습니다");
	}

	return { kind, summary, sections, caveats };
};

const section = (text) => ({ type: "section", text: { type: "mrkdwn", text } });

/** 항목 하나 = section 블록 하나. 블록마다 3000자 한도라 항목을 한 블록에 몰지 않습니다. */
const buildItemBlock = ({ title, detail, action }, index) =>
	section(
		[`*${index + 1}. ${title}*`, detail, action ? `→ *제안:* ${action}` : null]
			.filter(Boolean)
			.join("\n"),
	);

/** YYYY-MM-DD → M/D. 제목에만 쓰는 짧은 표기입니다. */
const formatShortDate = (date) => {
	const [, month, day] = String(date).split("-");

	return `${Number(month)}/${Number(day)}`;
};

const buildTitle = (context) =>
	context.kind === "daily"
		? `AI 인사이트 — ${formatShortDate(context.targetDate)} 어제의 특이점`
		: `AI 인사이트 — ${formatShortDate(context.week.start)}~${formatShortDate(context.week.end)} 주간`;

/**
 * 검증된 인사이트를 스레드 댓글 페이로드로 만듭니다.
 *
 * 맨 아래 줄에 AI 가 쓴 글이라는 표시와 워크플로 런 링크를 답니다. 숫자의 출처를
 * 따라가 볼 수 있어야 틀린 해석을 가려낼 수 있습니다.
 *
 * @param {object} params
 * @param {object} params.insight normalizeGaInsight 의 결과
 * @param {object} params.context 리포트 스크립트가 남긴 인사이트 입력
 * @param {string | null} params.runUrl
 */
export const buildGaInsightPayload = ({ insight, context, runUrl }) => {
	const title = buildTitle(context);
	const body =
		insight.kind === "daily"
			? insight.insights.map(buildItemBlock)
			: insight.sections.flatMap(({ heading, items }) => [
					section(`*${heading}*`),
					...items.map(buildItemBlock),
				]);

	return {
		// 푸시 미리보기와 접근성 대체 텍스트로 쓰입니다. 링크 문법 없이 평문으로 둡니다.
		text: title,
		blocks: [
			section([`*${title}*`, insight.summary].filter(Boolean).join("\n")),
			...body,
			...(insight.caveats.length > 0
				? [
						{
							type: "context",
							elements: [
								{
									type: "mrkdwn",
									text: insight.caveats
										.map((caveat) => `단서: ${caveat}`)
										.join("\n"),
								},
							],
						},
					]
				: []),
			{
				type: "context",
				elements: [
					{
						type: "mrkdwn",
						text: runUrl ? `AI 생성 · <${runUrl}|워크플로 런>` : "AI 생성",
					},
				],
			},
		],
	};
};
