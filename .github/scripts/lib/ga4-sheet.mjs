/**
 * 주간 GA 수치를 구글 시트에 주 단위로 쌓습니다.
 *
 * Slack 리포트는 그 주를 읽고 흘려보내는 메시지라 몇 주에 걸친 추이를 볼 수
 * 없습니다. 시트는 같은 수치를 한 주 한 행으로 남겨 추이를 그릴 수 있게 합니다.
 *
 * 쓰기는 늘 "읽고 → 합치고 → 통째로 덮어쓰기"입니다. append 로 행을 붙이면 같은
 * 주를 다시 돌릴 때마다 행이 하나씩 늘어나, 추이를 그리는 쪽에서 같은 주가 두 번
 * 세어집니다. 크론 재실행과 백필이 같은 주를 여러 번 건드리는 것이 정상 동작이라
 * 이 파일의 핵심 약속은 "몇 번을 돌려도 주마다 한 행"입니다.
 */

import { FUNNEL_EVENTS } from "./ga4-weekly.mjs";
import { requestJson } from "./http.mjs";

/** 시트 읽기·쓰기에 필요한 scope. GA 조회 scope 와 따로 토큰을 받습니다. */
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

/** 주당 1행. 활성 사용자와 퍼널 단계별 사용자 수. */
export const SUMMARY_TAB = "요약";

/** 주 × 이벤트당 1행. 이벤트별 사용자 수. */
export const EVENT_TAB = "이벤트";

/**
 * 서울 기준 `YYYY-MM-DD HH:mm`. 기록 시각 열에 씁니다.
 *
 * 러너는 UTC 로 돌아서 toISOString 을 그대로 쓰면 월요일 아침 기록이 일요일
 * 밤으로 찍힙니다. 시트를 읽는 사람의 시계에 맞춥니다.
 */
export const formatSeoulMinute = (date) => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Seoul",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		})
			.formatToParts(date)
			.map(({ type, value }) => [type, value]),
	);

	return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

/**
 * 요약 탭의 한 행(헤더 → 값).
 *
 * funnel 이 null 이면 퍼널 칸을 0 이 아니라 빈 문자열로 둡니다. 퍼널을 조회할 수
 * 없던 주를 0명으로 적으면 "아무도 넘어가지 않았다"는 틀린 기록이 되고, 차트에서는
 * 실제 0명과 구분되지 않습니다.
 */
export const buildSummaryRow = ({
	week,
	activeUsers,
	funnel,
	recordedAt,
	source,
}) => {
	const funnelCells = funnel
		? funnel.map(({ eventName, users }) => [`퍼널: ${eventName}`, users])
		: FUNNEL_EVENTS.map((eventName) => [`퍼널: ${eventName}`, ""]);

	return {
		"주 시작일": week.start,
		"주 종료일": week.end,
		"활성 사용자": activeUsers,
		...Object.fromEntries(funnelCells),
		"기록 시각": recordedAt,
		"기록 경위": source,
	};
};

/**
 * 이벤트 탭의 행들. 이벤트마다 한 행입니다.
 *
 * report.features 는 사용자가 1명 이상인 이벤트만 담고 있어, 그대로 옮기면 아무도
 * 안 쓴 주의 이벤트는 행이 없습니다. "행 없음"은 "조회하지 않은 주"(백필 시작 전)와
 * 구분되지 않으므로, 조회한 주는 eventNames 전체를 돌며 0명도 적습니다.
 */
export const buildEventRows = ({
	week,
	eventNames,
	features,
	recordedAt,
	source,
}) => {
	const usersByEvent = new Map(
		features.map(({ eventName, users }) => [eventName, users]),
	);

	return eventNames.map((eventName) => ({
		"주 시작일": week.start,
		이벤트: eventName,
		"사용자 수": usersByEvent.get(eventName) ?? 0,
		"기록 시각": recordedAt,
		"기록 경위": source,
	}));
};

/**
 * 시트의 기존 값(values)에 새 행(rows)을 합칩니다. 첫 행이 헤더입니다.
 *
 * - 헤더에 없는 열은 끝에 붙입니다. 기존 열의 순서와 지금은 안 쓰는 옛 열을 그대로
 *   둡니다. 퍼널 단계가 바뀌어도 옛 주의 옛 단계 값이 사라지지 않고, 사람이 시트에
 *   걸어 둔 차트·수식의 열 참조가 밀리지 않습니다.
 * - 키 열 값이 같은 행은 그 자리를 덮어씁니다. 새 행에 없는 열의 기존 값은 남깁니다.
 * - 키가 없으면 끝에 붙입니다.
 *
 * 키 비교는 문자열로 합니다. 시트는 값을 표시 문자열로 돌려주므로, 숫자와 문자열이
 * 섞여 비교가 어긋나면 같은 주가 새 행으로 한 번 더 붙습니다.
 */
export const mergeRows = ({ values, rows, keyColumns }) => {
	const header = [...(values[0] ?? [])];

	for (const row of rows) {
		for (const column of Object.keys(row)) {
			if (!header.includes(column)) {
				header.push(column);
			}
		}
	}

	// 시트 API 는 행 끝의 빈 칸을 잘라서 돌려줍니다. 헤더 길이에 맞춰 채웁니다.
	const body = values
		.slice(1)
		.map((cells) => header.map((_, index) => cells[index] ?? ""));
	const keyIndexes = keyColumns.map((column) => header.indexOf(column));
	const readKey = (cells) =>
		JSON.stringify(keyIndexes.map((index) => String(cells[index] ?? "")));
	const rowIndexByKey = new Map();

	for (const [index, cells] of body.entries()) {
		const key = readKey(cells);

		if (!rowIndexByKey.has(key)) {
			rowIndexByKey.set(key, index);
		}
	}

	for (const row of rows) {
		const cells = header.map((column) => row[column]);
		const key = readKey(cells);
		const existingIndex = rowIndexByKey.get(key);

		if (existingIndex === undefined) {
			rowIndexByKey.set(key, body.length);
			body.push(cells.map((cell) => cell ?? ""));

			continue;
		}

		body[existingIndex] = body[existingIndex].map((previous, index) =>
			cells[index] === undefined ? previous : cells[index],
		);
	}

	return [header, ...body];
};

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

const buildHeaders = (accessToken) => ({
	authorization: `Bearer ${accessToken}`,
	"content-type": "application/json",
});

/**
 * 탭 이름을 A1 표기의 시트 부분으로 바꿉니다. 작은따옴표로 감싸야 공백·기호가 든
 * 이름도 범위로 읽힙니다. 이름 안의 작은따옴표는 두 번 적어 이스케이프합니다.
 */
const toSheetRange = (title) => `'${title.replaceAll("'", "''")}'`;

/** 탭이 없으면 만듭니다. 새 스프레드시트에도 손으로 탭을 만들 필요가 없습니다. */
export const ensureTab = async ({ accessToken, spreadsheetId, title }) => {
	const base = `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}`;
	const spreadsheet = await requestJson(
		`${base}?fields=${encodeURIComponent("sheets.properties.title")}`,
		{ headers: buildHeaders(accessToken) },
	);
	const exists = (spreadsheet.sheets ?? []).some(
		(sheet) => sheet.properties?.title === title,
	);

	if (exists) {
		return;
	}

	await requestJson(`${base}:batchUpdate`, {
		method: "POST",
		headers: buildHeaders(accessToken),
		body: JSON.stringify({
			requests: [{ addSheet: { properties: { title } } }],
		}),
	});
};

/**
 * 탭에 행을 합쳐 씁니다. 같은 키의 행은 덮어쓰고, 없는 키는 붙입니다.
 *
 * 합친 결과를 A1 부터 통째로 PUT 합니다. 한 요청이라 중간에 끊겨도 탭이 반쯤
 * 섞인 상태로 남지 않습니다. 합친 결과는 기존보다 행·열이 줄지 않으므로 덮어쓴
 * 범위 밖에 옛 값이 남는 일도 없습니다.
 */
export const upsertTab = async ({
	accessToken,
	spreadsheetId,
	title,
	rows,
	keyColumns,
}) => {
	await ensureTab({ accessToken, spreadsheetId, title });

	const base = `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}`;
	const range = toSheetRange(title);
	const current = await requestJson(
		`${base}/values/${encodeURIComponent(range)}`,
		{ headers: buildHeaders(accessToken) },
	);
	// 빈 탭이면 values 키 자체가 오지 않습니다.
	const values = mergeRows({ values: current.values ?? [], rows, keyColumns });

	await requestJson(
		`${base}/values/${encodeURIComponent(`${range}!A1`)}?valueInputOption=RAW`,
		{
			method: "PUT",
			headers: buildHeaders(accessToken),
			body: JSON.stringify({ majorDimension: "ROWS", values }),
		},
	);
};
