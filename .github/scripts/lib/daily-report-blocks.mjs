/**
 * 데일리 GA 리포트의 Slack Block Kit 페이로드 조립.
 *
 * 이 메시지는 매일 아침 같은 자리에 쌓입니다. 어제와 눈으로 비교되어야 하므로
 * 블록 순서와 줄 수를 값에 따라 바꾸지 않습니다 — 유일한 예외가 이상치로,
 * 걸린 게 없는 날은 블록 자체를 빼서 "조용한 날"이 한눈에 보이게 합니다.
 */

import { CORE_EVENTS, TRAFFIC_EVENTS, readEventStat } from "./ga4-data.mjs";

/**
 * 퍼널 단계.
 *
 * 전환율을 찍지 않습니다. side_panel_open 은 사이드 패널 전용(확장 Measurement
 * Protocol)이고 memo_write 는 packages/shared 훅에서 나가 웹·확장 양쪽에서
 * 발화합니다. 모집단이 달라 나누면 100%를 넘습니다.
 */
const FUNNEL_STEPS = [
	{ eventName: "side_panel_open", label: "사이드 패널 열기" },
	{ eventName: "memo_write", label: "메모 작성" },
];

/** 표에 올릴 이름. 이상치·미출시는 42종 전체가 대상이라 원래 이벤트 이름을 그대로 씁니다. */
const EVENT_LABELS = {
	side_panel_open: "사이드 패널 열기",
	memo_write: "메모 작성",
	memo_open: "메모 열기",
	memo_search: "메모 검색",
	summary_complete: "요약 성공",
	summary_fail: "요약 실패",
	chat_message_send: "채팅 전송",
	login: "로그인",
	sign_up: "가입",
	extension_installed: "확장 설치",
};

/**
 * 미출시 목록에 이름을 몇 개까지 펼칠지.
 *
 * Slack context 엘리먼트는 3000자가 한도이고, 넘으면 메시지 전체가 거절됩니다.
 * 42종이 전부 미출시인 최악의 경우도 이 수로 접으면 한도 근처에 가지 않습니다.
 */
const UNRELEASED_PREVIEW = 8;

const OUTLIER_MARKS = {
	dropped: "⛔",
	spiked: "🔺",
	dipped: "🔻",
};

const formatCount = (value) => Math.round(value).toLocaleString("ko-KR");

/** 평균은 정수로 반올림하면 1 미만의 이벤트가 전부 0 으로 뭉개집니다. */
const formatAverage = (value) => value.toFixed(1);

/** 평균이 0 이면 변화율을 낼 분모가 없습니다. 0%로 적는 대신 아예 뺍니다. */
const formatChange = (yesterday, average7) => {
	if (average7 <= 0) return null;

	const percent = Math.round(((yesterday - average7) / average7) * 100);

	return `${percent >= 0 ? "+" : ""}${percent}%`;
};

/** "2026-09-11 (금)". 날짜 문자열이 곧 서울 기준 날짜라 UTC 자정으로 읽습니다. */
const formatHeaderDate = (targetDate) => {
	const weekday = new Intl.DateTimeFormat("ko-KR", {
		timeZone: "UTC",
		weekday: "short",
	}).format(new Date(`${targetDate}T00:00:00Z`));

	return `${targetDate} (${weekday})`;
};

/** 값 + 평균 + 변화율을 한 덩어리로. 라벨 폭은 Slack 이 비례폭이라 맞추지 않습니다. */
const describeStat = ({ label, value, unit, average7 }) => {
	const change = formatChange(value, average7);
	const detail = [`7일 평균 ${formatAverage(average7)}`, change]
		.filter(Boolean)
		.join(" · ");

	return `${label}  *${formatCount(value)}${unit}*  (${detail})`;
};

const buildFunnelBlock = (events) => {
	const lines = FUNNEL_STEPS.map(({ eventName, label }) => {
		const { users } = readEventStat(events, eventName);

		return describeStat({
			label,
			value: users.yesterday,
			unit: "명",
			average7: users.average7,
		});
	});

	return {
		type: "section",
		text: { type: "mrkdwn", text: ["*퍼널*", ...lines].join("\n") },
	};
};

/**
 * 핵심 이벤트는 사람 수가 아니라 발생 건수로 봅니다.
 * 이 리포트가 묻는 것은 "몇 명이 왔나"가 아니라 "로깅이 살아 있나"입니다.
 */
const buildCoreEventsBlock = (events) => {
	const lines = CORE_EVENTS.map((eventName) => {
		const { count } = readEventStat(events, eventName);

		return describeStat({
			label: EVENT_LABELS[eventName] ?? eventName,
			value: count.yesterday,
			unit: "건",
			average7: count.average7,
		});
	});

	return {
		type: "section",
		text: {
			type: "mrkdwn",
			text: ["*핵심 이벤트*  (어제 / 7일 평균)", ...lines].join("\n"),
		},
	};
};

const buildOutlierBlock = (outliers) => {
	const lines = outliers.map(({ eventName, yesterday, average7, kind }) => {
		const change = formatChange(yesterday, average7);
		const detail = [`7일 평균 ${formatAverage(average7)}`, change]
			.filter(Boolean)
			.join(" · ");

		return `${OUTLIER_MARKS[kind]} \`${eventName}\`  *${formatCount(yesterday)}건*  (${detail})`;
	});

	return {
		type: "section",
		text: { type: "mrkdwn", text: ["*이상치*", ...lines].join("\n") },
	};
};

/**
 * 본문에 올리기엔 곁가지지만 없으면 수치를 오독하게 되는 것들.
 *
 * 유입 참고치에 "필터 없음"을 반드시 붙입니다. 위 지표는 전부
 * build_env=production 으로 걸러진 값이라, 같은 자리에 나란히 두면
 * 같은 기준으로 잰 수치로 읽힙니다.
 */
const buildContextBlock = ({
	trafficTotals,
	unreleasedEvents,
	observationStart,
	observationTruncated,
	runUrl,
}) => {
	const traffic = TRAFFIC_EVENTS.map(
		(eventName) => `${eventName} ${formatCount(trafficTotals[eventName] ?? 0)}`,
	).join(" · ");

	const lines = [`유입 참고치(필터 없음): ${traffic}`];

	if (unreleasedEvents.length > 0) {
		const shown = unreleasedEvents.slice(0, UNRELEASED_PREVIEW).join(", ");
		const hidden = unreleasedEvents.length - UNRELEASED_PREVIEW;

		lines.push(
			`미출시 ${unreleasedEvents.length}종: ${shown}${hidden > 0 ? ` 외 ${hidden}종` : ""}`,
		);
	}

	// 조회 범위가 보존 기간에 잘렸으면 미출시가 실제보다 부풀려집니다.
	// 잘린 줄 모르고 "미출시 6종"을 단정하는 것보다 범위를 밝히는 편이 낫습니다.
	if (observationTruncated) {
		lines.push(
			`관측 이력 조회 범위: ${observationStart}~ (보존 기간 제한 — 미출시 판정이 부풀려질 수 있습니다)`,
		);
	}

	lines.push(
		// 로컬 드라이런에는 런이 없습니다. 깨진 링크를 남기지 않고 줄에서 뺍니다.
		["build_env=production", runUrl && `<${runUrl}|워크플로 런>`]
			.filter(Boolean)
			.join(" · "),
	);

	return {
		type: "context",
		elements: [{ type: "mrkdwn", text: lines.join("\n") }],
	};
};

/** 하루치 집계 결과를 그대로 받아 보낼 페이로드로 만듭니다. */
export const buildDailyReportPayload = ({ report, runUrl }) => {
	const {
		targetDate,
		events,
		outliers,
		unreleasedEvents,
		observationStart,
		observationTruncated,
		trafficTotals,
	} = report;
	const headline = `어제의 웹 메모 — ${formatHeaderDate(targetDate)}`;

	return {
		// 푸시 미리보기와 접근성 대체 텍스트로 쓰입니다. 링크 문법 없이 평문으로 둡니다.
		text: [
			headline,
			outliers.length > 0 ? `이상치 ${outliers.length}건` : "이상치 없음",
		].join(" · "),
		blocks: [
			{
				type: "header",
				text: { type: "plain_text", text: headline, emoji: true },
			},
			buildFunnelBlock(events),
			buildCoreEventsBlock(events),
			{ type: "divider" },
			// 걸린 게 없는 날은 빈 자리를 남기지 않고 블록째 뺍니다.
			...(outliers.length > 0 ? [buildOutlierBlock(outliers)] : []),
			buildContextBlock({
				trafficTotals,
				unreleasedEvents,
				observationStart,
				observationTruncated,
				runUrl,
			}),
		],
	};
};
