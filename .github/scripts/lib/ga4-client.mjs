/**
 * GA4 Data API 를 부르는 저수준 조각과 리포트가 함께 쓰는 필터.
 *
 * 데일리(ga4-data.mjs)와 위클리(ga4-weekly.mjs) 두 리포트가 같이 씁니다. 원래
 * ga4-data.mjs 안에만 있던 것을 꺼냈습니다 — 두 벌로 복제하면 한쪽만 고쳐져
 * 같은 속성을 보면서 서로 다른 수치를 내는데, 둘 다 조용히 성공하므로
 * 채널에서는 어느 쪽이 틀렸는지 구분할 수 없습니다.
 */

import { requestJson } from "./http.mjs";

/** GA4 Data API 는 읽기 전용 scope 로 충분합니다. */
export const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

/** 한 번의 runReport 가 돌려줄 행 수 상한. 이벤트 종류 × 며칠이라 여유가 큽니다. */
export const REPORT_ROW_LIMIT = 10000;

export const runReport = async ({ accessToken, propertyId, body }) =>
	await requestJson(
		`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
		{
			method: "POST",
			headers: {
				authorization: `Bearer ${accessToken}`,
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		},
	);

/** runReport 응답의 행을 [차원값...] + [지표값...] 으로 펴 줍니다. */
export const readRows = (report) =>
	(report.rows ?? []).map((row) => ({
		dimensions: (row.dimensionValues ?? []).map((value) => value.value),
		metrics: (row.metricValues ?? []).map((value) => Number(value.value) || 0),
	}));

/**
 * 지표의 모수로 삼을 호스트.
 *
 * 운영 트래픽을 가려내는 기준으로 build_env 를 쓸 수 없는 지표가 있습니다.
 * 그 파라미터는 우리가 직접 쏘는 커스텀 이벤트에만 붙어서, activeUsers 처럼
 * gtag 자동 수집에 기대는 지표에는 필터가 아예 걸리지 않습니다. 한 메시지 안에서
 * 기준이 다른 수치를 나란히 두면 서로 맞지 않는 숫자가 됩니다. 그래서 주간
 * 리포트는 모든 섹션을 이 호스트 허용 목록 하나로 통일합니다.
 *
 * 허용 목록 자체를 없애도 안 됩니다. 이 속성에는 로컬 개발 트래픽이 그대로
 * 들어오는데, 실측해 보면 2026-09-07~09-13 한 주에 localhost 가 588명으로
 * 모든 호스트 가운데 가장 큽니다(같은 주 운영 웹은 34명). 필터가 없으면
 * 리포트의 주 신호가 사용자가 아니라 우리 개발 환경이 됩니다. staging 도
 * 같은 이유로 목록에 없습니다.
 *
 * 뒤의 두 값이 확장입니다. 사이드 패널은 chrome-extension:// 문서라 hostName 에
 * 호스트가 잡히지 않고 "(not set)" 또는 빈 문자열로 들어옵니다. 사이드 패널이
 * 이 서비스의 주된 사용 경로라 활성 사용자의 대부분이 이 두 값에 몰려 있습니다 —
 * 빼면 리포트가 답하려는 질문 자체에 답하지 못합니다.
 *
 * ⚠️ 같은 목록이 apps/web/src/modules/ga/config.ts 의 INCLUDED_HOST_NAMES 에도
 * 있습니다. 지금은 일부러 복제해 두었으니 **도메인을 바꾸면 두 곳을 함께 고쳐야
 * 합니다.** 한쪽만 고치면 대시보드와 슬랙 리포트가 다른 모수를 세게 됩니다.
 */
export const INCLUDED_HOST_NAMES = [
	"www.webmemo.xyz", // 운영 웹
	"web-memos.vercel.app", // Vercel 프로덕션 별칭으로 추정
	"(not set)", // 확장
	"", // 확장
];

/**
 * 허용 목록에 있는 호스트만 남기는 dimensionFilter.
 *
 * ⚠️ inListFilter 한 줄로 줄이지 마세요. 목록에 빈 문자열이 들어 있는데
 * inListFilter 는 빈 값을 값으로 취급하지 않아 그 항목이 조용히 사라집니다.
 * 그러면 확장 트래픽의 한 축이 통째로 빠진 채 리포트가 정상으로 보입니다.
 * EXACT 필터를 orGroup 으로 묶는 지금 형태가 빈 문자열까지 정확히 셉니다.
 */
export const HOST_NAME_FILTER = {
	orGroup: {
		expressions: INCLUDED_HOST_NAMES.map((hostName) => ({
			filter: {
				fieldName: "hostName",
				stringFilter: { matchType: "EXACT", value: hostName },
			},
		})),
	},
};
