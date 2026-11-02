/**
 * 데일리 리포트용 Search Console 상위 검색어.
 *
 * 검색어는 GA4 에 없습니다((not provided)). Search Console 만 갖고 있습니다.
 * 확정 데이터는 약 3일 늦게 나오므로 "어제"가 아니라 resolveGscWeeks 의 최근 7일
 * (PT 기준, 확정 지연 제외)을 봅니다. 기간은 결과에 실어 리포트가 그대로 밝힙니다.
 *
 * 실패해도 리포트 전체를 막지 않습니다. 자격 증명이 없으면 skipped, 조회가 실패하면
 * failed 로 돌려주어 "데이터 없음"과 구분됩니다.
 */

import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";
import {
	GSC_READONLY_SCOPE,
	GSC_SITE_URL,
	requestGsc,
	resolveGscWeeks,
	safeFailure,
} from "../seo/seo-gsc.mjs";

const TOP_QUERY_LIMIT = 5;

const defaultSleep = (milliseconds) =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));

export const fetchTopSearchQueries = async ({
	serviceAccountJson,
	now = new Date(),
	fetcher = fetch,
	sleep = defaultSleep,
}) => {
	if (!serviceAccountJson) return { status: "skipped" };

	try {
		const { start, end } = resolveGscWeeks(now);
		const accessToken = await exchangeServiceAccountToken({
			serviceAccount: JSON.parse(serviceAccountJson),
			scope: GSC_READONLY_SCOPE,
		});
		const response = await requestGsc({
			url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
			accessToken,
			body: {
				startDate: start,
				endDate: end,
				dimensions: ["query"],
				rowLimit: TOP_QUERY_LIMIT,
				dataState: "final",
			},
			fetcher,
			sleep,
		});

		return {
			status: "ok",
			startDate: start,
			endDate: end,
			queries: (response.rows ?? []).map((row) => ({
				query: row.keys?.[0] ?? "",
				clicks: row.clicks ?? 0,
				impressions: row.impressions ?? 0,
			})),
		};
	} catch (error) {
		// 응답 본문·토큰이 섞일 수 있어 원문 대신 분류된 메시지만 남깁니다.
		console.warn(
			`::warning::Search Console 검색어 조회 실패: ${safeFailure(error).message}`,
		);

		return { status: "failed" };
	}
};
