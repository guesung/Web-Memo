/**
 * 주간 GA 리포트의 Slack Block Kit 페이로드 조립.
 *
 * 데일리 리포트(daily-report-blocks.mjs)와 달리 이 메시지는 읽고 나서 무언가를
 * 결정하라고 쌓입니다. 데일리가 "어제와 눈으로 비교"되기 위해 블록 수를 고정하는
 * 반면, 여기는 판단에 쓰이지 않는 줄을 적극적으로 뺍니다 — 걸린 게 없는 단은
 * 아예 등장하지 않습니다.
 *
 * 네 섹션의 순서가 곧 질문의 순서입니다. 얼마나 쓰였나(활성 사용자) → 무엇을
 * 쓰나(기능별) → 어디서 새나(퍼널) → 무엇을 안 쓰나(안 쓰인 기능). 마지막
 * 섹션이 "다음에 뭘 만들지"에 가장 직접적으로 답하므로 아래에 둡니다.
 */

import { FUNNEL_EVENTS } from "./ga4-weekly.mjs";

/** 퍼널 단계 이름. 순서는 ga4-weekly.mjs 의 FUNNEL_EVENTS 가 갖습니다. */
const FUNNEL_LABELS = {
	extension_installed: "확장 설치",
	side_panel_open: "사이드 패널 열기",
	side_panel_login_click: "로그인하러가기 클릭",
	login_start: "로그인 버튼 클릭",
	sign_up: "가입",
	memo_write: "메모 작성",
};

/**
 * 기능별 섹션에 펼칠 이벤트 수.
 *
 * 46종을 전부 적으면 정작 판단에 쓰이는 마지막 섹션까지 눈이 닿지 않습니다.
 * 잘린 것은 줄 끝에 "외 N종"으로 밝혀, 접힌 것과 없는 것을 구분합니다.
 */
const FEATURE_PREVIEW = 12;

/**
 * 안 쓰인 기능 각 단에 펼칠 이름 수.
 *
 * Slack section 블록의 text 는 3000자가 한도이고 넘으면 메시지 전체가 거절됩니다.
 * 세 단이 동시에 최악이어도 이 수로 접으면 한도 근처에 가지 않습니다.
 */
const UNUSED_PREVIEW = 10;

const formatCount = (value) => Math.round(value).toLocaleString("ko-KR");

/**
 * 전주 대비 증감.
 *
 * 전주가 0 이면 변화율을 낼 분모가 없습니다. 0% 나 +∞% 로 적는 대신 줄에서 뺍니다 —
 * 앞에 이미 "전주 0명"이 붙어 있어 증감을 따로 적지 않아도 읽힙니다.
 */
const formatChange = (current, previous) => {
	if (previous <= 0) return null;

	const percent = Math.round(((current - previous) / previous) * 100);

	return `전주 대비 ${percent >= 0 ? "+" : ""}${percent}%`;
};

/** 전환율은 소수점 한 자리까지. 정수로 반올림하면 한 자릿수 구간이 뭉개집니다. */
const formatRate = (rate) => `${(rate * 100).toFixed(1)}%`;

/** "2026-09-07 ~ 2026-09-13". 두 값 모두 이미 서울 기준 날짜 문자열입니다. */
const formatRange = (start, end) => `${start} ~ ${end}`;

/** 이름 목록을 미리보기 수만큼 자르고, 잘린 만큼을 밝힙니다. */
const previewNames = (entries, limit) => {
	const shown = entries
		.slice(0, limit)
		.map(({ eventName, users }) => `\`${eventName}\`${users > 0 ? ` ${users}명` : ""}`)
		.join(", ");
	const hidden = entries.length - limit;

	return hidden > 0 ? `${shown} 외 ${hidden}종` : shown;
};

const buildActiveUsersBlock = ({ activeUsers, start, end }) => {
	const change = formatChange(activeUsers.current, activeUsers.previous);
	const detail = [`전주 ${formatCount(activeUsers.previous)}명`, change]
		.filter(Boolean)
		.join(" · ");

	return {
		type: "section",
		text: {
			type: "mrkdwn",
			text: [
				`*주간 활성 사용자*  (${formatRange(start, end)})`,
				`*${formatCount(activeUsers.current)}명*  (${detail})`,
			].join("\n"),
		},
	};
};

/**
 * 기능별 사용자 수.
 *
 * 퍼널 단계 이벤트는 여기서 뺍니다. 퍼널 섹션이 이미 같은 이벤트를 같은 단위(사람
 * 수)로 보여주고 있어, 남겨 두면 한 메시지에 같은 줄이 두 번 나옵니다. 빠진 게 아니라
 * 옮겨간 것입니다 — 데일리가 CORE_EVENTS 에서 퍼널 2종을 뺀 것과 같은 이유입니다.
 * 다만 퍼널 쪽 숫자는 순서 강제라 여기의 이벤트별 사용자 수와 같지 않습니다.
 */
const buildFeatureBlock = (features) => {
	const rest = features.filter(
		({ eventName }) => !FUNNEL_EVENTS.includes(eventName),
	);
	const lines = rest
		.slice(0, FEATURE_PREVIEW)
		.map(({ eventName, users, previousUsers }) => {
			const change = formatChange(users, previousUsers);
			const detail = [`전주 ${formatCount(previousUsers)}명`, change]
				.filter(Boolean)
				.join(" · ");

			return `\`${eventName}\`  *${formatCount(users)}명*  (${detail})`;
		});
	const hidden = rest.length - FEATURE_PREVIEW;

	if (hidden > 0) {
		lines.push(`_… 1명 이상 쓰인 기능 ${rest.length}종 중 상위 ${FEATURE_PREVIEW}종_`);
	}

	return {
		type: "section",
		text: {
			type: "mrkdwn",
			text: [
				`*기능별 사용자 수*  (퍼널 ${FUNNEL_EVENTS.length}종 제외)`,
				...lines,
			].join("\n"),
		},
	};
};

/**
 * 퍼널.
 *
 * 전환율은 바로 앞 단계 대비입니다. 첫 단계는 비교 대상이 없어 비율을 적지
 * 않습니다. 순서 강제 퍼널이라 앞 단계를 밟은 같은 사용자만 다음 단계에 남고, 그래서
 * 전환율이 100%를 넘지 않습니다. 첫 단계가 그 주의 신규 설치자라는 점은 context 줄에
 * 밝힙니다.
 */
const buildFunnelBlock = (funnel) => {
	const lines = funnel.map(({ eventName, users, conversionRate }) => {
		const label = FUNNEL_LABELS[eventName] ?? eventName;
		const rate =
			conversionRate === null ? "" : `  (전 단계 대비 ${formatRate(conversionRate)})`;

		return `${label}  *${formatCount(users)}명*${rate}`;
	});

	return {
		type: "section",
		text: { type: "mrkdwn", text: ["*퍼널*", ...lines].join("\n") },
	};
};

/**
 * 안 쓰인 기능 세 단.
 *
 * 빈 단은 줄째로 뺍니다. "한 번도 안 쓰임 0종"이라는 줄은 정보가 없는데도
 * 자리를 차지해, 정작 걸린 단을 밀어냅니다.
 */
const buildUnusedBlock = ({ unused, thresholds }) => {
	const lines = [];

	if (unused.never.length > 0) {
		lines.push(
			`⛔ *한 번도 안 쓰임* ${unused.never.length}종 — ${previewNames(unused.never, UNUSED_PREVIEW)}`,
		);
	}

	if (unused.rare.length > 0) {
		lines.push(
			`🔻 *거의 안 쓰임* ${unused.rare.length}종 (WAU의 ${thresholds.RARE_RATIO * 100}% 미만 · ${thresholds.RARE_MAX_USERS}명 이하) — ${previewNames(unused.rare, UNUSED_PREVIEW)}`,
		);
	}

	if (unused.fresh.length > 0) {
		lines.push(
			`🆕 *신규 · 판단 보류* ${unused.fresh.length}종 (첫 관측 ${thresholds.NEW_EVENT_WINDOW_DAYS}일 미만) — ${previewNames(unused.fresh, UNUSED_PREVIEW)}`,
		);
	}

	if (lines.length === 0) {
		lines.push("_모든 기능이 기준 이상으로 쓰였습니다._");
	}

	return {
		type: "section",
		text: { type: "mrkdwn", text: ["*안 쓰인 기능*", ...lines].join("\n") },
	};
};

/**
 * 수치를 오독하지 않게 하는 단서들.
 *
 * 모수를 반드시 밝힙니다. 커스텀 이벤트와 퍼널은 hostName 허용 목록과
 * build_env=production 을 함께 적용하지만, 자동 수집 기반 활성 사용자는
 * build_env 가 없어 hostName 허용 목록만 적용합니다.
 */
const buildContextBlock = ({
	eventNames,
	previousStart,
	previousEnd,
	runUrl,
	sheetUrl,
}) => {
	const lines = [
		`전주 비교 기간: ${formatRange(previousStart, previousEnd)}`,
		`이벤트 ${eventNames.length}종 (packages/shared 의 EVENT_CATEGORY 에서 읽음) · 사람 수 기준`,
		"모수: 커스텀 이벤트·퍼널은 hostName 허용 목록 + production, 활성 사용자는 hostName 허용 목록",
		"퍼널: 그 주에 설치한 사람이 같은 사용자로 단계를 순서대로 밟은 수 (순서 강제). 확장→웹 구간은 client_id 연결 배포 이후 데이터부터 이어집니다",
	];
	const links = [];

	if (runUrl) {
		links.push(`<${runUrl}|워크플로 런>`);
	}

	// 몇 주에 걸친 추이는 이 메시지가 아니라 누적 시트에서 봅니다.
	if (sheetUrl) {
		links.push(`<${sheetUrl}|누적 시트>`);
	}

	if (links.length > 0) {
		lines.push(links.join(" · "));
	}

	return {
		type: "context",
		elements: [{ type: "mrkdwn", text: lines.join("\n") }],
	};
};

/** 한 주치 집계 결과를 그대로 받아 보낼 페이로드로 만듭니다. */
export const buildWeeklyReportPayload = ({ report, runUrl, sheetUrl }) => {
	const {
		start,
		end,
		previousStart,
		previousEnd,
		eventNames,
		activeUsers,
		features,
		funnel,
		unused,
		thresholds,
	} = report;
	const headline = `지난주의 웹 메모 — ${formatRange(start, end)}`;

	return {
		// 푸시 미리보기와 접근성 대체 텍스트로 쓰입니다. 링크 문법 없이 평문으로 둡니다.
		text: [
			headline,
			`주간 활성 사용자 ${formatCount(activeUsers.current)}명`,
			`안 쓰인 기능 ${unused.never.length + unused.rare.length}종`,
		].join(" · "),
		blocks: [
			{
				type: "header",
				text: { type: "plain_text", text: headline, emoji: true },
			},
			buildActiveUsersBlock({ activeUsers, start, end }),
			buildFeatureBlock(features),
			buildFunnelBlock(funnel),
			{ type: "divider" },
			buildUnusedBlock({ unused, thresholds }),
			buildContextBlock({
				eventNames,
				previousStart,
				previousEnd,
				runUrl,
				sheetUrl,
			}),
		],
	};
};
