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
	buildHostNameFilter,
	GA4_SCOPE,
	HOST_NAME_FILTER,
	INCLUDED_HOST_NAMES,
	HOST_NAME_FUNNEL_FILTER,
	PRODUCTION_EVENT_FILTER,
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
 * 이벤트·퍼널을 조회할 수 있는 첫 주(월요일).
 *
 * 커스텀 이벤트와 퍼널은 build_env=production 으로 거르는데, 그 조건에 걸리는
 * 운영 데이터는 이 주부터만 있습니다. 그 전 주를 같은 조건으로 조회하면
 * 운영 트래픽이 (not set) 으로 통째로 빠져 "아무도 안 썼다"는 0명이 나옵니다 —
 * 실제로 안 쓴 것과 구분되지 않는 틀린 기록이 시트에 남습니다. 그래서 백필은
 * 이 주 이전에는 호스트 필터만 쓰는 활성 사용자만 적고 이벤트·퍼널은 비워 둡니다.
 */
export const EVENT_BACKFILL_SINCE = "2026-09-07";

/**
 * 활성 사용자를 백필할 수 있는 첫 주(월요일).
 *
 * 확장 트래픽((not set)·빈 호스트)이 GA 에 처음 찍힌 것이 2025-10-11(토)이라,
 * 온전한 한 주로 셀 수 있는 것은 그다음 월요일부터입니다. 그 전 주는 확장
 * 사용자가 어느 호스트로 들어왔는지 확인되지 않아, 조회하면 웹 사용자만 세거나
 * 호스트 필터에 아무것도 걸리지 않아 0명이 됩니다. 둘 다 실제와 구분되지 않는
 * 틀린 기록이라 백필 범위에서 막습니다.
 */
export const ACTIVE_USERS_BACKFILL_SINCE = "2025-10-13";

/**
 * EVENT_BACKFILL_SINCE 이전 주에 운영 웹이 쓰던 호스트.
 *
 * 운영 웹 도메인은 2026-09-02 에 www.webmemo.site 에서 www.webmemo.xyz 로
 * 옮겨졌습니다. 지금 허용 목록만으로 그 전 주를 세면 웹 사용자가 통째로 빠져
 * 확장 사용자만 남고, 9월에 갑자기 뛰는 가짜 성장 곡선이 됩니다. 옛 주의 활성
 * 사용자는 지금 목록에 이 호스트를 더해 셉니다. 2026-08-31 주는 두 도메인을
 * 모두 썼으므로 합집합이어야 빠지지 않습니다.
 */
const LEGACY_WEB_HOST_NAMES = ["www.webmemo.site"];

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
 * 월요일 start 로 주 객체를 만듭니다. 정기 리포트와 백필이 같은 모양을 써야
 * 시트의 한 행이 어느 쪽에서 왔든 같은 기간을 가리킵니다.
 */
const buildWeek = (start) => ({
	start,
	end: shiftDate(start, 6),
	previousStart: shiftDate(start, -7),
	previousEnd: shiftDate(start, -1),
});

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

	return buildWeek(shiftDate(today, -daysSinceMonday - 7));
};

/**
 * 실존하는 YYYY-MM-DD 인지. 형식만 보면 2026-02-30 이 통과하고, Date 는 그 값을
 * 3월로 넘겨 버려 엉뚱한 주를 조용히 조회합니다.
 */
const isCalendarDate = (dateString) =>
	/^\d{4}-\d{2}-\d{2}$/.test(dateString) &&
	shiftDate(dateString, 0) === dateString;

/**
 * from 주부터 to 주까지 주 객체를 오름차순으로 돌려줍니다. 백필이 도는 범위입니다.
 *
 * 입력이 어긋나면 조회를 시작하기 전에 던집니다. 월요일이 아닌 날을 받아 조용히
 * 월요일로 맞춰 주면 사람이 의도한 것과 다른 주가 시트에 적히고, 끝난 적 없는
 * 이번 주를 받으면 반쪽짜리 수치가 "그 주의 값"으로 남습니다. 둘 다 시트에서는
 * 멀쩡한 행이라 나중에 알아챌 방법이 없습니다.
 */
export const listWeeks = ({ from, to, now = new Date() }) => {
	for (const [name, value] of [
		["from", from],
		["to", to],
	]) {
		if (typeof value !== "string" || !isCalendarDate(value)) {
			throw new Error(
				`${name} 이(가) YYYY-MM-DD 형식의 실제 날짜가 아닙니다: ${value}`,
			);
		}

		if (readWeekday(value) !== 1) {
			throw new Error(`${name} 은(는) 월요일이어야 합니다: ${value}`);
		}
	}

	if (from > to) {
		throw new Error(`from(${from}) 이 to(${to}) 보다 늦습니다`);
	}

	if (from < ACTIVE_USERS_BACKFILL_SINCE) {
		throw new Error(
			`from(${from}) 은 ${ACTIVE_USERS_BACKFILL_SINCE} 이후여야 합니다. 그 전 주는 확장 트래픽이 없어 활성 사용자를 제대로 셀 수 없습니다`,
		);
	}

	const lastCompleteWeek = resolveTargetWeek(now).start;

	if (to > lastCompleteWeek) {
		throw new Error(
			`to(${to}) 는 끝난 주여야 합니다. 서울 기준 지난주 월요일(${lastCompleteWeek}) 이하로 주세요`,
		);
	}

	const weeks = [];

	for (let start = from; start <= to; start = shiftDate(start, 7)) {
		weeks.push(buildWeek(start));
	}

	return weeks;
};

/**
 * 이 주에 이벤트·퍼널을 조회할지. EVENT_BACKFILL_SINCE 이전 주는 활성 사용자만
 * 적습니다. 두 값 모두 월요일 YYYY-MM-DD 라 문자열 비교가 날짜 비교와 같습니다.
 */
export const shouldFetchEvents = (week) => week.start >= EVENT_BACKFILL_SINCE;

/**
 * 이번 실행이 무엇을 할지 정합니다. 주간 리포트 스크립트의 분기를 여기로 빼
 * 네트워크 없이 검증합니다.
 *
 * - from·to 가 둘 다 비었으면 정기 모드: 지난주 한 주. 크론이면 "정기", 손으로
 *   돌렸으면 "재실행"으로 기록합니다. 같은 주의 행이 덮어써졌을 때 시트에서 그
 *   경위를 알아볼 수 있어야 합니다.
 * - 둘 다 있으면 백필 모드: listWeeks 가 검증한 범위.
 * - 하나만 있으면 던집니다. 한쪽을 지난주로 채워 주면 입력을 빠뜨린 실수가
 *   수십 주짜리 백필로 조용히 바뀝니다.
 *
 * 워크플로 입력은 비워 두면 빈 문자열로 옵니다. 공백만 있는 값도 빈 값으로 봅니다.
 */
export const resolveRunPlan = ({
	eventName,
	weekFrom,
	weekTo,
	now = new Date(),
}) => {
	const from = weekFrom?.trim() ?? "";
	const to = weekTo?.trim() ?? "";

	if (!from && !to) {
		return {
			mode: "regular",
			source: eventName === "schedule" ? "정기" : "재실행",
			weeks: [resolveTargetWeek(now)],
		};
	}

	if (!from || !to) {
		throw new Error(
			`WEEK_FROM 과 WEEK_TO 는 함께 주거나 함께 비워야 합니다 (WEEK_FROM="${from}", WEEK_TO="${to}")`,
		);
	}

	return {
		mode: "backfill",
		source: "백필",
		weeks: listWeeks({ from, to, now }),
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
 * 기간의 활성 사용자 조회.
 *
 * 주간 리포트와 백필이 함께 씁니다. 두 벌로 두면 한쪽 필터만 고쳐져 시트의 과거
 * 주와 최근 주가 서로 다른 모수를 세게 되는데, 둘 다 조용히 성공하므로 추이의
 * 꺾임이 실제 변화인지 집계 차이인지 구분할 수 없습니다.
 */
const readActiveUsers = ({
	accessToken,
	propertyId,
	startDate,
	endDate,
	dimensionFilter = HOST_NAME_FILTER,
}) =>
	runReport({
		accessToken,
		propertyId,
		body: {
			dateRanges: [{ startDate, endDate }],
			metrics: [{ name: "activeUsers" }],
			dimensionFilter,
		},
	});

/**
 * 그 주의 활성 사용자를 셀 호스트 필터. EVENT_BACKFILL_SINCE 이전 주는 운영 웹이
 * 옛 도메인을 쓰던 때라 LEGACY_WEB_HOST_NAMES 를 더합니다. 이후 주는 정기
 * 리포트와 같은 HOST_NAME_FILTER 입니다.
 */
export const resolveActiveUsersFilter = (week) => {
	if (week.start >= EVENT_BACKFILL_SINCE) {
		return HOST_NAME_FILTER;
	}

	return buildHostNameFilter([
		...INCLUDED_HOST_NAMES,
		...LEGACY_WEB_HOST_NAMES,
	]);
};

/**
 * 한 주의 활성 사용자 수만 조회합니다. 이벤트·퍼널을 조회할 수 없는 옛 주의
 * 백필용입니다. 지표는 fetchWeeklyGa4Report 의 활성 사용자와 같고, 호스트는
 * resolveActiveUsersFilter 가 그 주에 맞게 고릅니다.
 */
export const fetchWeeklyActiveUsers = async ({
	serviceAccountJson,
	propertyId,
	week,
}) => {
	const accessToken = await exchangeServiceAccountToken({
		serviceAccount: JSON.parse(serviceAccountJson),
		scope: GA4_SCOPE,
	});

	return readSingleMetric(
		await readActiveUsers({
			accessToken,
			propertyId,
			startDate: week.start,
			endDate: week.end,
			dimensionFilter: resolveActiveUsersFilter(week),
		}),
	);
};

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

/** 퍼널 각 단계에 이벤트 이름, 호스트 허용 목록, production 조건을 함께 겁니다. */
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
				{
					funnelFieldFilter: {
						fieldName: "customEvent:build_env",
						stringFilter: { matchType: "EXACT", value: "production" },
					},
				},
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
 * 커스텀 이벤트와 퍼널은 호스트 허용 목록과 production 조건으로 거릅니다.
 * 자동 수집 이벤트에 기대는 활성 사용자는 호스트 허용 목록만 적용합니다.
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
				dimensionFilter: PRODUCTION_EVENT_FILTER,
				limit: REPORT_ROW_LIMIT,
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
		readActiveUsers({
			accessToken,
			propertyId,
			startDate: start,
			endDate: end,
		}),
		readActiveUsers({
			accessToken,
			propertyId,
			startDate: previousStart,
			endDate: previousEnd,
		}),
		runReport({
			accessToken,
			propertyId,
			body: {
				dateRanges: [{ startDate: OBSERVATION_SINCE, endDate: freshCutoff }],
				dimensions: [{ name: "eventName" }],
				metrics: [{ name: "eventCount" }],
				dimensionFilter: PRODUCTION_EVENT_FILTER,
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
