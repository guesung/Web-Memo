/**
 * GA4 Data API로 일자별 활성 사용자를 조회합니다.
 *
 * @description `.github/scripts/lib/ga4-data.mjs`의 `runReport` 래퍼와 응답 정규화,
 * 서울 기준 날짜 계산을 옮겨 온 것입니다. 관리자 대시보드의 추이 그래프 하나만
 * 책임지므로 그 스크립트의 이상치·미출시 판정은 가져오지 않았습니다.
 */

import {
	EXCLUDED_HOST_NAME_SUFFIX,
	EXCLUDED_HOST_NAMES,
	GA4_PROPERTY_ID,
	GA4_SCOPE,
} from "./config";
import { exchangeServiceAccountToken } from "./googleAuth";
import { requestJson } from "./requestJson";

/**
 * 주어진 시각을 서울 기준 YYYY-MM-DD로 적습니다.
 *
 * @description en-CA 로케일이 정확히 이 형태를 내므로 직접 조립하지 않습니다.
 * 서버는 UTC로 도는 탓에 자정 전후로 하루가 어긋납니다.
 */
export const formatSeoulDate = (date: Date) =>
	new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);

/** YYYY-MM-DD를 days만큼 옮깁니다. UTC 자정으로 고정해 서머타임 영향을 받지 않습니다. */
export const shiftDate = (dateString: string, days: number) =>
	new Date(Date.parse(`${dateString}T00:00:00Z`) + days * 86400000)
		.toISOString()
		.slice(0, 10);

/**
 * 집계가 끝난 마지막 날 = 서울 기준 "어제".
 *
 * @description GA4 표준 속성의 보고서는 24~48시간 지연돼 오늘 칸이 항상 미완성입니다.
 * 오늘을 끝으로 잡으면 그래프의 마지막 점이 매번 푹 꺼진 채로 그려집니다.
 */
export const resolveLatestCompleteDate = (now = new Date()) =>
	shiftDate(formatSeoulDate(now), -1);

/**
 * 최근 days일의 일자별 활성 사용자를 서울 기준 어제까지 조회합니다.
 *
 * @description 활성 사용자가 0인 날은 GA4가 행을 주지 않으므로 결과에서도 빠집니다.
 * 빈 날을 0으로 채워 넣지 않는 것은 "데이터가 없는 날"과 "정말 0명인 날"을 서버가
 * 임의로 합치지 않기 위해서입니다.
 */
export const fetchActiveUsersByDate = async ({
	serviceAccountJson,
	days,
}: {
	serviceAccountJson: string;
	days: number;
}): Promise<IFActiveUsersReport> => {
	const accessToken = await exchangeServiceAccountToken({
		serviceAccount: JSON.parse(serviceAccountJson),
		scope: GA4_SCOPE,
	});
	const endDate = resolveLatestCompleteDate();
	const startDate = shiftDate(endDate, -(days - 1));

	const report = await requestJson<IFRunReportResponse>(
		`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
		{
			method: "POST",
			headers: {
				authorization: `Bearer ${accessToken}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				dateRanges: [{ startDate, endDate }],
				dimensions: [{ name: "date" }],
				metrics: [{ name: "activeUsers" }],
				dimensionFilter: PRODUCTION_HOST_FILTER,
				orderBys: [{ dimension: { dimensionName: "date" } }],
				limit: days,
				returnPropertyQuota: true,
			}),
		},
	);

	logPropertyQuota(report.propertyQuota);

	return {
		rows: readRows(report),
		asOf: endDate.replace(/-/g, ""),
	};
};

/**
 * 비운영 트래픽을 걷어내는 필터.
 *
 * @description `activeUsers`는 gtag 자동 수집 기반이라 커스텀 이벤트에만 붙는
 * `customEvent:build_env`로는 거를 수 없습니다. 표준 차원 `hostName`만이 선택지입니다.
 * 이 필터를 빠뜨리면 로컬과 스테이징 트래픽이 섞여 GA 콘솔 값과 영영 어긋납니다.
 */
const PRODUCTION_HOST_FILTER = {
	andGroup: {
		expressions: [
			{
				notExpression: {
					filter: {
						fieldName: "hostName",
						inListFilter: { values: EXCLUDED_HOST_NAMES },
					},
				},
			},
			{
				notExpression: {
					filter: {
						fieldName: "hostName",
						stringFilter: {
							matchType: "ENDS_WITH",
							value: EXCLUDED_HOST_NAME_SUFFIX,
						},
					},
				},
			},
		],
	},
};

/** runReport 응답의 행을 그래프가 바로 쓸 수 있는 형태로 폅니다. */
const readRows = (report: IFRunReportResponse): IFActiveUsersRow[] =>
	(report.rows ?? []).map((row) => ({
		date: row.dimensionValues?.[0]?.value ?? "",
		activeUsers: Number(row.metricValues?.[0]?.value) || 0,
	}));

/**
 * 이번 호출이 실제로 쓴 쿼터를 로그로 남깁니다.
 *
 * @description 속성당 일일 20만 토큰을 얼마나 쓰는지 추측하지 않고 실측으로 확인하기
 * 위한 것입니다. 대시보드를 하루 몇 번 열어도 되는지는 이 숫자가 답합니다.
 */
const logPropertyQuota = (propertyQuota?: IFPropertyQuota) => {
	if (!propertyQuota) {
		return;
	}

	console.log(
		`[GA4] 활성 사용자 조회 쿼터 — 일일 ${propertyQuota.tokensPerDay?.consumed ?? 0} 소모 / ${propertyQuota.tokensPerDay?.remaining ?? 0} 잔여, 시간당 ${propertyQuota.tokensPerHour?.consumed ?? 0} 소모 / ${propertyQuota.tokensPerHour?.remaining ?? 0} 잔여`,
	);
};

/** 일자별 활성 사용자 한 점. */
export interface IFActiveUsersRow {
	/** GA4의 date 차원 원형인 구분자 없는 YYYYMMDD */
	date: string;
	/** 그날의 활성 사용자 수 */
	activeUsers: number;
}

/** 조회 결과. */
export interface IFActiveUsersReport {
	/** 날짜 오름차순. 활성 사용자가 0인 날은 들어 있지 않습니다 */
	rows: IFActiveUsersRow[];
	/** 집계가 끝난 마지막 날(YYYYMMDD). 화면이 "○월 ○일까지 집계"를 그리는 근거입니다 */
	asOf: string;
}

/** 소모량 한 종류. */
interface IFQuotaUsage {
	/** 이번 요청이 쓴 양 */
	consumed?: number;
	/** 남은 양 */
	remaining?: number;
}

/** 응답에 실려 오는 실제 쿼터 소모량. */
interface IFPropertyQuota {
	/** 일일 토큰 */
	tokensPerDay?: IFQuotaUsage;
	/** 시간당 토큰 */
	tokensPerHour?: IFQuotaUsage;
}

/** runReport 응답 중 이 모듈이 읽는 부분만 적습니다. */
interface IFRunReportResponse {
	/** 차원값·지표값 쌍의 목록. 결과가 없으면 아예 오지 않습니다 */
	rows?: Array<{
		dimensionValues?: Array<{ value?: string }>;
		metricValues?: Array<{ value?: string }>;
	}>;
	/** `returnPropertyQuota: true`일 때만 실립니다 */
	propertyQuota?: IFPropertyQuota;
}
