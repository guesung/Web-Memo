/**
 * GA4 Data API로 어제 하루의 이벤트 지표를 조회하고 집계합니다.
 *
 * 이 리포트가 답하는 질문은 "로깅이 살아 있는가"입니다. 그래서 수치 자체보다
 * 7일 평균 대비 급변(이상치)과 한 번도 관측된 적 없는 이벤트(미출시)를 봅니다.
 *
 * 이벤트 목록은 packages/shared/src/modules/analytics/type.ts 의 TAnalyticsEvent 가
 * 단일 진실 원천입니다. 이 스크립트는 의존성 없이 도는 .mjs 라 TS 를 import 할 수
 * 없어 아래 ANALYTICS_EVENTS 로 옮겨 적습니다. 이벤트를 추가하면 여기도 고칩니다.
 *
 * ⚠️ 두 목록이 어긋나도 아무것도 실패하지 않습니다. type.ts 에만 있는 이벤트는
 * 이상치 판정 모집단에서 빠져 로깅이 죽어도 영영 리포트에 뜨지 않고, 미출시
 * 목록에도 오르지 않아 "한 번도 안 나온 이벤트"로도 드러나지 않습니다. 반대로
 * 여기에만 남은 이벤트는 미출시로 영구히 오분류됩니다. 리포트가 조용한 것과
 * 목록이 어긋난 것을 채널에서는 구분할 수 없습니다.
 */

import {
	GA4_SCOPE,
	REPORT_ROW_LIMIT,
	readRows,
	runReport,
} from "./ga4-client.mjs";
import { exchangeServiceAccountToken } from "./google-auth.mjs";

/**
 * 관측 이력을 따질 시작점. 이 날 이전은 로깅 개편 전이라 의미가 없습니다.
 * "한 번도 관측된 적 없음"은 이 날부터 어제까지를 통틀어 0건이라는 뜻입니다.
 *
 * ⚠️ 이 값이 GA4 이벤트 데이터 보존 기간 밖일 수 있습니다. 보존은 속성 설정에 따라
 * 2개월 또는 14개월인데, 2개월이면 이 시작일은 통째로 잘립니다. 그러면 실제로는
 * 관측된 적 있는 이벤트가 "미출시"로 오분류되고, API 는 에러 없이 잘린 범위의
 * 결과만 돌려줍니다. 그래서 실제 보존 시작일을 따로 읽어 리포트에 함께 싣습니다
 * (readObservationStart). 조회 범위가 잘렸으면 미출시 판정을 단정하지 않습니다.
 */
const OBSERVATION_SINCE = "2026-01-01";

/** 이동평균을 낼 기간(일). target-7 ~ target-1. */
const MOVING_AVERAGE_DAYS = 7;

/** 이상치 판정 기준. 비율만 보면 작은 수가 요동쳐 매일 걸리므로 절대 차이를 함께 봅니다. */
const OUTLIER_RATIO = 0.5;
const OUTLIER_ABSOLUTE = 5;

/**
 * "어제 0"을 끊김으로 볼 최소 7일 평균. 평균 0.1 짜리 이벤트는 원래 대부분의 날이
 * 0이라 하루 비었다고 알릴 일이 아닙니다. 첫 실데이터에서 이상치 8건 중 5건이
 * 이런 경우여서, 매일 도배되는 경고가 이상치 섹션 전체를 읽히지 않게 만들었습니다.
 */
const OUTLIER_DROP_MIN_AVERAGE = 1;

/**
 * gtag 가 자동으로 쏘는 유입 이벤트. build_env 파라미터가 붙지 않아
 * 다른 지표와 같은 필터로는 잡히지 않습니다. 참고치로만 따로 조회합니다.
 */
export const TRAFFIC_EVENTS = ["first_visit", "page_view"];

/**
 * 매일 표에 올리는 이벤트. 나머지는 이상치로 걸릴 때만 등장합니다.
 *
 * 퍼널 2종(side_panel_open·memo_write)은 일부러 뺐습니다. 퍼널 섹션이 이미
 * 그 둘을 "몇 명이 썼나"로 보여주고 있어, 여기 두면 같은 이벤트가 단위만
 * 바뀐 채 한 메시지에 두 번 나옵니다. 빠진 게 아니라 옮겨간 것입니다.
 */
export const CORE_EVENTS = [
	"memo_open",
	"memo_search",
	"summary_complete",
	"summary_fail",
	"chat_message_send",
	"login",
	"sign_up",
	"extension_installed",
];

/** TAnalyticsEvent 의 이름 전체. 미출시 판정과 이상치 판정의 모집단입니다. */
export const ANALYTICS_EVENTS = [
	"side_panel_open",
	"page_view",
	"memo_write",
	"memo_delete",
	"summary_run",
	"summary_complete",
	"chat_message_send",
	"tab_change",
	"setting_change",
	"memo_filter",
	"youtube_transcript_extract",
	"side_panel_open_click",
	"highlight_note_update",
	"login",
	"memo_search",
	"memo_open",
	"memo_source_open",
	"memo_restore",
	"memo_delete_permanently",
	"summary_fail",
	"chat_fail",
	"category_create",
	"category_update",
	"category_delete",
	"feedback_submit",
	"view_change",
	"logout",
	"extension_installed",
	"login_start",
	"side_panel_login_click",
	"sign_up",
	"memo_status_toggle",
	"memo_category_change",
	"memo_undo",
	"category_suggestion_show",
	"category_suggestion_apply",
	"extension_install_click",
	"extension_install_dismiss",
	"open_web_from_extension",
	"guide_open",
	"guide_finish",
	"extension_setting_change",
];

/**
 * 주어진 시각을 서울 기준 YYYY-MM-DD 로 적습니다.
 *
 * en-CA 로케일이 정확히 이 형태를 내므로 직접 조립하지 않습니다.
 * 서버는 UTC 로 돌아 자정 전후로 하루가 어긋납니다.
 */
export const formatSeoulDate = (date) =>
	new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);

/** YYYY-MM-DD 를 days 만큼 옮깁니다. UTC 자정으로 고정해 서머타임 영향을 받지 않습니다. */
export const shiftDate = (dateString, days) =>
	new Date(Date.parse(`${dateString}T00:00:00Z`) + days * 86400000)
		.toISOString()
		.slice(0, 10);

/**
 * 리포트가 다룰 날짜 = 서울 기준 "어제".
 *
 * 실행 시각에서 역산하지 않습니다. GitHub 크론은 수십 분 지연이 흔해,
 * 07:00 잡이 다음 날 00:30 에 돌면 하루를 통째로 건너뜁니다.
 */
export const resolveTargetDate = (now = new Date()) =>
	shiftDate(formatSeoulDate(now), -1);

/** 운영 트래픽만 남기는 필터. staging·development 이벤트를 지표에서 걸러냅니다. */
const PRODUCTION_FILTER = {
	filter: {
		fieldName: "customEvent:build_env",
		stringFilter: { matchType: "EXACT", value: "production" },
	},
};

/**
 * 미출시 판정 전용. production 만 보면 build_env 가 붙기 전(2026-08-30 이전)의
 * 운영 트래픽이 (not set) 으로 통째로 빠져, 오래전부터 쓰이던 이벤트가 "미출시"로
 * 잘못 분류됩니다. 그래서 staging 만 걸러냅니다 — 스테이징에서만 시험한 이벤트는
 * 여전히 미출시로 남고, development 빌드는 애초에 GA4 로 보내지 않습니다.
 */
const NOT_STAGING_FILTER = {
	notExpression: {
		filter: {
			fieldName: "customEvent:build_env",
			stringFilter: { matchType: "EXACT", value: "staging" },
		},
	},
};

/**
 * GA4 가 실제로 데이터를 갖고 있는 가장 이른 날짜.
 *
 * 요청한 시작일보다 뒤면 보존 기간에 잘렸다는 뜻입니다. 미출시 판정용 요청은
 * date 차원이 없어(42종 × 250일이면 행 수 상한에 닿습니다) 이것만 따로 묻습니다.
 * date 오름차순 첫 행 하나라 비용이 사실상 없습니다.
 */
const readObservationStart = async ({ accessToken, propertyId, targetDate }) => {
	const report = await runReport({
		accessToken,
		propertyId,
		body: {
			dateRanges: [{ startDate: OBSERVATION_SINCE, endDate: targetDate }],
			dimensions: [{ name: "date" }],
			metrics: [{ name: "eventCount" }],
			orderBys: [{ dimension: { dimensionName: "date" } }],
			limit: 1,
		},
	});
	const earliest = report.rows?.[0]?.dimensionValues?.[0]?.value;

	if (!earliest) return null;

	return `${earliest.slice(0, 4)}-${earliest.slice(4, 6)}-${earliest.slice(6, 8)}`;
};

/**
 * 이벤트별 어제 값과 7일 이동평균.
 *
 * GA4 의 date 차원은 구분자 없는 YYYYMMDD 라 비교 전에 하이픈을 끼워 넣습니다.
 * 평균의 분모는 실제로 행이 있던 날 수가 아니라 항상 7 입니다 — 0 인 날을
 * 빼면 "어제만 0" 같은 사고가 평균에 묻혀 드러나지 않습니다.
 */
const aggregateDaily = (rows, targetDate) => {
	const weekStart = shiftDate(targetDate, -MOVING_AVERAGE_DAYS);
	const events = {};

	for (const { dimensions, metrics } of rows) {
		const [rawDate, eventName] = dimensions;
		const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
		const [users, count] = metrics;

		events[eventName] ??= {
			users: { yesterday: 0, average7: 0 },
			count: { yesterday: 0, average7: 0 },
		};

		if (date === targetDate) {
			events[eventName].users.yesterday += users;
			events[eventName].count.yesterday += count;

			continue;
		}

		if (date >= weekStart && date < targetDate) {
			events[eventName].users.average7 += users;
			events[eventName].count.average7 += count;
		}
	}

	for (const event of Object.values(events)) {
		event.users.average7 /= MOVING_AVERAGE_DAYS;
		event.count.average7 /= MOVING_AVERAGE_DAYS;
	}

	return events;
};

/** 값이 없는 이벤트는 "0건"과 같습니다. 호출부가 매번 옵셔널 체이닝을 하지 않게 채워 줍니다. */
export const readEventStat = (events, eventName) =>
	events[eventName] ?? {
		users: { yesterday: 0, average7: 0 },
		count: { yesterday: 0, average7: 0 },
	};

/**
 * 이상치 = 로깅이 죽었거나 갑자기 튄 이벤트.
 *
 * (a) 평소 나오던 이벤트가 어제 0건 → 배포로 로깅이 끊긴 신호
 * (b) 7일 평균 대비 ±50% 이상 변동하면서 절대 차이도 5 이상
 *
 * 평균이 0 인 이벤트는 (b)의 분모가 없어 판정하지 않습니다. 그쪽은 "미출시"가 답합니다.
 *
 * 유입 이벤트(first_visit·page_view)는 모집단에서 뺍니다. 볼륨이 다른 이벤트보다
 * 두 자릿수 커서 평소의 트래픽 등락만으로도 ±50% 규칙에 상시 걸립니다. 매일 걸리는
 * 줄은 이상치 섹션 전체를 읽히지 않게 만듭니다. 이 둘은 유입 참고치 줄이 맡습니다.
 */
export const detectOutliers = (events) =>
	ANALYTICS_EVENTS.filter(
		(eventName) => !TRAFFIC_EVENTS.includes(eventName),
	).map((eventName) => {
		const { count } = readEventStat(events, eventName);
		const { yesterday, average7 } = count;

		if (average7 <= 0) return null;

		if (yesterday === 0) {
			if (average7 < OUTLIER_DROP_MIN_AVERAGE) return null;

			return { eventName, yesterday, average7, kind: "dropped" };
		}

		const difference = yesterday - average7;

		if (
			Math.abs(difference) < OUTLIER_ABSOLUTE ||
			Math.abs(difference) / average7 < OUTLIER_RATIO
		) {
			return null;
		}

		return {
			eventName,
			yesterday,
			average7,
			kind: difference > 0 ? "spiked" : "dipped",
		};
	}).filter(Boolean);

/**
 * 어제 하루치 지표를 세 번의 runReport 로 모읍니다.
 *
 * ① 어제 + 직전 7일의 이벤트별 사용자·발생 수 (운영 트래픽만)
 * ② 관측 시작일 이후 한 번이라도 나온 이벤트 이름 (미출시 판정용)
 * ③ 유입 참고치. gtag 자동 이벤트라 build_env 가 없어 필터 없이 봅니다
 */
export const fetchDailyGa4Report = async ({
	serviceAccountJson,
	propertyId,
	targetDate = resolveTargetDate(),
}) => {
	const accessToken = await exchangeServiceAccountToken({
		serviceAccount: JSON.parse(serviceAccountJson),
		scope: GA4_SCOPE,
	});
	const weekStart = shiftDate(targetDate, -MOVING_AVERAGE_DAYS);

	const [daily, lifetime, traffic, observationStart] = await Promise.all([
		runReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate: weekStart, endDate: targetDate }],
				dimensions: [{ name: "date" }, { name: "eventName" }],
				metrics: [{ name: "activeUsers" }, { name: "eventCount" }],
				dimensionFilter: PRODUCTION_FILTER,
				limit: REPORT_ROW_LIMIT,
			},
		}),
		runReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate: OBSERVATION_SINCE, endDate: targetDate }],
				dimensions: [{ name: "eventName" }],
				metrics: [{ name: "eventCount" }],
				dimensionFilter: NOT_STAGING_FILTER,
				limit: REPORT_ROW_LIMIT,
			},
		}),
		runReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate: targetDate, endDate: targetDate }],
				dimensions: [{ name: "eventName" }],
				metrics: [{ name: "eventCount" }],
				dimensionFilter: {
					filter: {
						fieldName: "eventName",
						inListFilter: { values: TRAFFIC_EVENTS },
					},
				},
				limit: REPORT_ROW_LIMIT,
			},
		}),
		readObservationStart({ accessToken, propertyId, targetDate }),
	]);

	const events = aggregateDaily(readRows(daily), targetDate);
	const observed = new Set(
		readRows(lifetime).map(({ dimensions }) => dimensions[0]),
	);
	const trafficTotals = Object.fromEntries(
		readRows(traffic).map(({ dimensions, metrics }) => [
			dimensions[0],
			metrics[0],
		]),
	);

	return {
		targetDate,
		events,
		outliers: detectOutliers(events),
		// 목록에 이름조차 없으면 관측 시작일 이후 한 번도 발화한 적이 없다는 뜻입니다.
		unreleasedEvents: ANALYTICS_EVENTS.filter(
			(eventName) => !observed.has(eventName),
		),
		// 요청한 시작일보다 뒤면 보존 기간에 잘린 것이라 미출시 판정을 믿을 수 없습니다.
		observationStart: observationStart ?? OBSERVATION_SINCE,
		observationTruncated:
			observationStart !== null && observationStart > OBSERVATION_SINCE,
		trafficTotals,
	};
};
