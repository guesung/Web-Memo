/**
 * GA4 Data API 로 지난주 한 주의 사용 현황을 조회하고 집계합니다.
 *
 * 데일리 리포트(ga4-data.mjs)와 목적이 다릅니다. 그쪽이 답하는 질문은 "로깅이
 * 살아 있는가"(감시)이고, 이쪽이 답하는 질문은 "사람들이 무엇을 쓰고 있고 다음에
 * 무엇을 만들어야 하는가"(사용 현황)입니다. 그래서 같은 메시지에 섞지 않고 리포트를
 * 따로 뺐습니다. 감시용 지표를 여기에 들이거나 이 리포트의 판정을 데일리로
 * 옮기면 두 질문이 한 화면에서 뒤섞여 어느 쪽도 읽히지 않게 됩니다.
 *
 * 세는 단위도 다릅니다. 데일리는 발생 건수(eventCount)로 로깅의 맥을 짚지만
 * 여기는 사람 수(totalUsers)를 셉니다. 무엇을 만들지는 몇 번 눌렸는지가 아니라
 * 몇 명이 썼는지가 답합니다.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	GA4_SCOPE,
	HOST_NAME_FILTER,
	HOST_NAME_FUNNEL_FILTER,
	REPORT_ROW_LIMIT,
	readRows,
	runFunnelReport,
	runReport,
} from "./ga4-client.mjs";
// 서울 기준 날짜 계산은 데일리가 이미 갖고 있습니다. 같은 규칙을 두 벌로 두면
// 한쪽만 고쳐져 두 리포트의 기간이 어긋나므로 그대로 가져다 씁니다.
import { formatSeoulDate, shiftDate } from "./ga4-data.mjs";
import { exchangeServiceAccountToken } from "./google-auth.mjs";

/**
 * 이벤트 이름 목록의 단일 진실 원천.
 *
 * 데일리는 이 목록을 ANALYTICS_EVENTS 에 손으로 옮겨 적고 있고, 그 파일 머리에
 * "두 목록이 어긋나도 아무것도 실패하지 않는다"는 경고가 달려 있습니다. 그 경고는
 * 이미 현실이 됐습니다 — type.ts 가 46종일 때 옮겨 적은 목록은 42종이었고, 빠진
 * 넷은 이상치 판정 모집단에서도 미출시 목록에서도 제외돼 로깅이 죽어도 영영
 * 리포트에 뜨지 않았습니다. 주간 리포트는 같은 실수를 되풀이하지 않기 위해
 * 목록을 베끼지 않고 원본을 런타임에 읽습니다.
 */
const EVENT_SOURCE_PATH = fileURLToPath(
	new URL(
		"../../../packages/shared/src/modules/analytics/type.ts",
		import.meta.url,
	),
);

/**
 * EVENT_CATEGORY 의 본문만 떼어냅니다.
 *
 * TAnalyticsEvent 유니온이 아니라 이쪽을 읽는 이유가 있습니다. 유니온 멤버는
 * 파라미터가 딸려 여러 줄에 걸쳐 있어 정규식으로 이름만 뽑기가 까다롭지만,
 * EVENT_CATEGORY 는 Record 로 선언돼 모든 이벤트가 한 줄에 `이름: "분류"` 로
 * 놓입니다. 게다가 Record 라서 이벤트를 추가하고 여기에 넣지 않으면 컴파일이
 * 실패합니다 — 이 목록이 유니온보다 뒤처질 수 없다는 보장을 타입 검사가 해 줍니다.
 */
const EVENT_CATEGORY_BLOCK_PATTERN =
	/EVENT_CATEGORY[^=]*=\s*\{([\s\S]*?)\n\};/;

/** 블록 안의 `이름: "분류",` 한 줄에서 이름만 집습니다. */
const EVENT_NAME_PATTERN = /^\s*([a-z][a-z0-9_]*)\s*:/gm;

/** 관측 이력을 따질 시작점. 이 날 이전은 로깅 개편 전이라 의미가 없습니다. */
const OBSERVATION_SINCE = "2026-01-01";

/**
 * "안 쓰인 기능" 판정 임계값. 세 값을 여기 한 곳에 모읍니다.
 *
 * 비율(RARE_RATIO)과 절대치(RARE_MAX_USERS)를 **둘 다** 겁니다. 비율만 보면 WAU 가
 * 작을 때 몇 명짜리 기능이 매주 걸려 섹션이 도배되고, 절대치만 보면 사용자가
 * 늘었을 때 아무것도 걸리지 않습니다. 데일리의 이상치 판정이 OUTLIER_RATIO 와
 * OUTLIER_ABSOLUTE 를 함께 쓰는 것과 같은 이유이고, 거기서는 비율만 보던 시절
 * 이상치 8건 중 5건이 그런 노이즈여서 섹션 전체가 읽히지 않았습니다.
 *
 * 사용자가 늘면 **하한인 RARE_MAX_USERS 만 올리면 됩니다.** RARE_RATIO 는 WAU 에
 * 비례하므로 그대로 두어도 기준이 따라 올라갑니다.
 *
 * NEW_EVENT_WINDOW_DAYS 는 "신규(판단 보류)" 단을 가르는 기간입니다. 이 단을
 * 따로 두지 않으면 지난주에 출시한 기능이 매번 "안 쓰이는 기능"으로 올라와
 * 진짜 죽은 기능을 묻어 버립니다.
 */
const RARE_RATIO = 0.01;
const RARE_MAX_USERS = 5;
const NEW_EVENT_WINDOW_DAYS = 14;

/**
 * 퍼널 단계. 신규 설치자가 실제로 걸어가는 순서입니다.
 *
 * 순서가 곧 조회 조건입니다. 순서 강제 퍼널은 같은 사용자가 앞 단계를 먼저 밟아야
 * 다음 단계로 세므로, 가입(sign_up)은 메모 작성(memo_write)보다 앞에 있어야 합니다.
 * 로그인 없이는 메모를 쓸 수 없어서 가입이 뒤에 오면 두 단계가 서로를 지웁니다.
 * 메모 작성은 가입 뒤의 "활성화" 단계로 마지막에 둡니다.
 *
 * 3~5단계(로그인하러가기 클릭 → 로그인 버튼 클릭 → 가입)는 확장에서 웹으로 넘어가는
 * 구간이라, 확장의 client_id 를 웹의 _ga 쿠키로 이어받는 변경이 배포된 뒤의 데이터부터
 * 같은 사용자로 이어집니다. 그 전 기간에는 이 구간이 실제보다 낮게 나옵니다.
 *
 * 라벨은 표시 계층(weekly-report-blocks.mjs)이 갖습니다. 여기서는 순서와
 * 단계 사이의 전환율만 계산합니다.
 */
const FUNNEL_EVENTS = [
	"extension_installed",
	"side_panel_open",
	"side_panel_login_click",
	"login_start",
	"sign_up",
	"memo_write",
];

/**
 * type.ts 의 EVENT_CATEGORY 키를 읽어 이벤트 이름 전체를 돌려줍니다.
 *
 * 이 스크립트는 의존성 없이 도는 .mjs 라 TS 를 import 할 수 없어 파일을 텍스트로
 * 읽고 정규식으로 긁습니다.
 *
 * 0건이면 **던집니다.** 파일이 옮겨졌거나 선언 형태가 바뀌면 정규식은 조용히 빈
 * 배열을 내는데, 그대로 흘려보내면 "모든 기능이 정상"처럼 보이는 빈 리포트가
 * 매주 채널에 쌓입니다. 조용한 0건이 이 레포가 반복해서 당한 실패 방식이라,
 * 여기서는 리포트를 못 내는 편을 택합니다.
 */
export const readAnalyticsEventNames = () => {
	const source = readFileSync(EVENT_SOURCE_PATH, "utf8");
	const block = source.match(EVENT_CATEGORY_BLOCK_PATTERN);

	if (!block) {
		throw new Error(
			`${EVENT_SOURCE_PATH} 에서 EVENT_CATEGORY 선언을 찾지 못했습니다`,
		);
	}

	const eventNames = [...block[1].matchAll(EVENT_NAME_PATTERN)].map(
		([, eventName]) => eventName,
	);

	if (eventNames.length === 0) {
		throw new Error(
			`${EVENT_SOURCE_PATH} 의 EVENT_CATEGORY 에서 이벤트 이름을 하나도 읽지 못했습니다`,
		);
	}

	return eventNames;
};

/** YYYY-MM-DD 의 요일. 일요일이 0 입니다. UTC 자정으로 고정해 서머타임을 피합니다. */
const readWeekday = (dateString) =>
	new Date(`${dateString}T00:00:00Z`).getUTCDay();

/**
 * 리포트가 다룰 기간 = 서울 기준 지난주 월요일부터 일요일까지.
 *
 * 실행 시각에서 역산하지 않습니다. GitHub 크론은 수십 분 지연이 흔해서, 월요일
 * 08:00 잡이 자정을 넘겨 돌 수 있습니다. 데일리가 같은 이유로 resolveTargetDate 를
 * 따로 두고 있습니다. 여기서는 "오늘이 속한 주의 월요일에서 7일 앞"으로 기간을
 * 잡아, 화요일로 밀려 실행되더라도 같은 주를 가리키게 했습니다.
 */
export const resolveTargetWeek = (now = new Date()) => {
	const today = formatSeoulDate(now);
	// getUTCDay 는 일요일이 0 이라 월요일이 0 이 되도록 옮깁니다.
	const daysSinceMonday = (readWeekday(today) + 6) % 7;
	const start = shiftDate(today, -daysSinceMonday - 7);

	return {
		start,
		end: shiftDate(start, 6),
		previousStart: shiftDate(start, -7),
		previousEnd: shiftDate(start, -1),
	};
};

/** 이벤트 이름 → 사용자 수. 행이 없는 이벤트는 0 명입니다. */
const readUserTotals = (report) =>
	Object.fromEntries(
		readRows(report).map(({ dimensions, metrics }) => [
			dimensions[0],
			metrics[0],
		]),
	);

/** 지표가 한 칸뿐인 응답에서 그 값만 꺼냅니다. 행이 없으면 0 입니다. */
const readSingleMetric = (report) => readRows(report)[0]?.metrics[0] ?? 0;

/**
 * 안 쓰인 기능을 세 단으로 나눕니다.
 *
 * 순서가 곧 판정 우선순위입니다. 신규를 가장 먼저 걸러내지 않으면 지난주 출시한
 * 기능이 "한 번도 안 쓰임"으로 올라가, 정말 죽은 기능과 구분되지 않습니다.
 */
const classifyUnusedFeatures = ({
	eventNames,
	userTotals,
	activeUsers,
	observedBefore,
}) => {
	const never = [];
	const rare = [];
	const fresh = [];

	for (const eventName of eventNames) {
		const users = userTotals[eventName] ?? 0;

		// 관측 이력이 최근 14일 안에서만 시작된 이벤트는 판단을 보류합니다.
		if (!observedBefore.has(eventName)) {
			fresh.push({ eventName, users });

			continue;
		}

		if (users === 0) {
			never.push({ eventName, users });

			continue;
		}

		// 비율과 절대치를 함께 겁니다. 둘 중 하나만 걸리면 넘어갑니다.
		if (users <= RARE_MAX_USERS && users < activeUsers * RARE_RATIO) {
			rare.push({ eventName, users });
		}
	}

	return {
		never,
		rare: rare.sort((a, b) => a.users - b.users),
		fresh: fresh.sort((a, b) => b.users - a.users),
	};
};

/** 퍼널 한 단계의 조건. 이벤트 이름과 호스트 허용 목록을 함께 겁니다. */
const buildFunnelStep = (eventName) => ({
	name: eventName,
	filterExpression: {
		andGroup: {
			expressions: [
				{
					funnelFieldFilter: {
						fieldName: "eventName",
						stringFilter: { matchType: "EXACT", value: eventName },
					},
				},
				HOST_NAME_FUNNEL_FILTER,
			],
		},
	},
});

/**
 * 퍼널 응답을 이벤트 이름 → 단계 통과 사용자 수로 펴 줍니다.
 *
 * 행이 없는 단계는 0 명입니다. 다만 행이 있는데 activeUsers 를 못 찾으면 던집니다.
 * 그대로 두면 모든 단계가 조용히 0 명이 되어 "아무도 안 넘어갔다"로 읽히는데, 이 레포가
 * 반복해서 당한 조용한 0건 실패입니다.
 */
const readFunnelUsers = (funnelReport) => {
	const table = funnelReport.funnelTable ?? {};
	const rows = table.rows ?? [];
	const usersIndex = (table.metricHeaders ?? []).findIndex(
		({ name }) => name === "activeUsers",
	);

	if (rows.length > 0 && usersIndex === -1) {
		throw new Error("퍼널 응답에서 activeUsers 지표를 찾지 못했습니다");
	}

	return Object.fromEntries(
		rows.map((row) => [
			// GA 가 단계 이름 앞에 "1. " 처럼 순번을 붙여 돌려줍니다.
			row.dimensionValues[0].value.replace(/^\d+\.\s*/, ""),
			Number(row.metricValues[usersIndex]?.value) || 0,
		]),
	);
};

/**
 * 퍼널 단계별 사용자 수와 전 단계 대비 전환율.
 *
 * 입력이 순서 강제 조회 결과라 앞 단계를 밟은 사람만 다음 단계에 남습니다. 그래서
 * 전환율이 100%를 넘지 않습니다.
 *
 * 전 단계가 0 명이면 전환율을 낼 분모가 없습니다. 0% 로 적으면 "아무도 넘어가지
 * 않았다"로 읽히므로 null 로 두고 표시 계층이 줄에서 뺍니다.
 */
const buildFunnel = (funnelUsers) =>
	FUNNEL_EVENTS.map((eventName, index) => {
		const users = funnelUsers[eventName] ?? 0;
		const previousUsers =
			index === 0 ? null : (funnelUsers[FUNNEL_EVENTS[index - 1]] ?? 0);

		return {
			eventName,
			users,
			conversionRate:
				previousUsers && previousUsers > 0 ? users / previousUsers : null,
		};
	});

/**
 * 지난주 사용 현황을 다섯 번의 runReport 와 한 번의 runFunnelReport 로 모읍니다.
 *
 * ① 지난주 이벤트별 사용자 수  ② 전주 이벤트별 사용자 수 (증감 비교용)
 * ③ 지난주 활성 사용자        ④ 전주 활성 사용자
 * ⑤ 최근 14일 이전에 한 번이라도 관측된 이벤트 (신규 판정용)
 * ⑥ 지난주 순서 강제 퍼널 (설치 → … → 메모 작성)
 *
 * 여섯 요청 모두 같은 호스트 허용 목록으로 거릅니다. build_env 로 거르지 않는
 * 이유는 HOST_NAME_FILTER 주석에 적어 두었습니다.
 */
export const fetchWeeklyGa4Report = async ({
	serviceAccountJson,
	propertyId,
	week = resolveTargetWeek(),
}) => {
	const eventNames = readAnalyticsEventNames();
	const accessToken = await exchangeServiceAccountToken({
		serviceAccount: JSON.parse(serviceAccountJson),
		scope: GA4_SCOPE,
	});
	const { start, end, previousStart, previousEnd } = week;
	// 신규 판정의 기준점은 실행 시각이 아니라 집계 기간의 끝입니다. 같은 주를
	// 다시 돌려도 같은 결과가 나와야 합니다.
	const freshCutoff = shiftDate(end, -NEW_EVENT_WINDOW_DAYS);

	const readEventUsers = (startDate, endDate) =>
		runReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate, endDate }],
				dimensions: [{ name: "eventName" }],
				metrics: [{ name: "totalUsers" }],
				dimensionFilter: HOST_NAME_FILTER,
				limit: REPORT_ROW_LIMIT,
			},
		});

	const readActiveUsers = (startDate, endDate) =>
		runReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate, endDate }],
				metrics: [{ name: "activeUsers" }],
				dimensionFilter: HOST_NAME_FILTER,
			},
		});

	const [
		current,
		previous,
		currentUsers,
		previousUsers,
		priorObservation,
		funnelReport,
	] = await Promise.all([
		readEventUsers(start, end),
		readEventUsers(previousStart, previousEnd),
		readActiveUsers(start, end),
		readActiveUsers(previousStart, previousEnd),
		runReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate: OBSERVATION_SINCE, endDate: freshCutoff }],
				dimensions: [{ name: "eventName" }],
				metrics: [{ name: "eventCount" }],
				dimensionFilter: HOST_NAME_FILTER,
				limit: REPORT_ROW_LIMIT,
			},
		}),
		runFunnelReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate: start, endDate: end }],
				funnel: { steps: FUNNEL_EVENTS.map(buildFunnelStep) },
			},
		}),
	]);

	const userTotals = readUserTotals(current);
	const previousTotals = readUserTotals(previous);
	const activeUsers = readSingleMetric(currentUsers);
	const observedBefore = new Set(
		readRows(priorObservation).map(({ dimensions }) => dimensions[0]),
	);

	return {
		start,
		end,
		previousStart,
		previousEnd,
		eventNames,
		activeUsers: {
			current: activeUsers,
			previous: readSingleMetric(previousUsers),
		},
		// 쓰인 기능만 많은 순으로. 0 명짜리는 "안 쓰인 기능"이 맡습니다.
		features: eventNames
			.map((eventName) => ({
				eventName,
				users: userTotals[eventName] ?? 0,
				previousUsers: previousTotals[eventName] ?? 0,
			}))
			.filter(({ users }) => users > 0)
			.sort((a, b) => b.users - a.users),
		funnel: buildFunnel(readFunnelUsers(funnelReport)),
		unused: classifyUnusedFeatures({
			eventNames,
			userTotals,
			activeUsers,
			observedBefore,
		}),
		thresholds: { RARE_RATIO, RARE_MAX_USERS, NEW_EVENT_WINDOW_DAYS },
	};
};

export { FUNNEL_EVENTS };
