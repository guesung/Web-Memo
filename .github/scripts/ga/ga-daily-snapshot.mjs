#!/usr/bin/env node
/**
 * GA4 일별 지표를 Supabase(memo.ga_daily_metrics)에 적재합니다.
 *
 * GA4 Data API 는 서비스 계정 키가 필요해 브라우저에서 못 부르고, 그 키를 Vercel 에 두지 않기로
 * 했습니다. 그래서 키가 이미 있는 GitHub Actions 가 일별 지표를 테이블에 쌓고, 관리자 화면은
 * Supabase RPC(get_admin_ga_daily_metrics)로 읽습니다.
 *
 * 행은 (date, metric) 하나가 한 줄입니다. metric 은 GA 이벤트 이름이거나 'active_users' 이고,
 * active_users 는 events 가 null 입니다. 같은 (date, metric)을 다시 적재하면 덮어쓰므로
 * 재실행·백필이 안전합니다.
 *
 * 사용:
 *   - 데일리 리포트가 report-daily-ga.mjs 에서 snapshotDailyMetrics 를 부릅니다(대상일-7 ~ 대상일).
 *   - 백필: GA4_SERVICE_ACCOUNT_JSON GA4_PROPERTY_ID SUPABASE_REPORT_SERVICE_ROLE_KEY 를 두고
 *       node .github/scripts/ga/ga-daily-snapshot.mjs --backfill-days 90
 */

import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
	HOST_NAME_FILTER,
	REPORT_ROW_LIMIT,
	GA4_SCOPE,
	readRows,
	runReport,
} from "./ga4-client.mjs";
import {
	PRODUCTION_FILTER,
	resolveTargetDate,
	shiftDate,
} from "./ga4-data.mjs";
import { readSupabaseUrl } from "./memo-retention.mjs";
import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";
import { requireEnv } from "../shared/run-context.mjs";

/** 활성 사용자 행의 metric 이름. 이벤트 이름과 겹치지 않습니다. */
export const ACTIVE_USERS_METRIC = "active_users";

/**
 * 데일리 적재가 다시 덮어쓰는 기간(대상일 기준 앞쪽 일수). 대상일 포함 8일치입니다.
 * GA4 는 하루 이틀 뒤에도 값이 보정되므로 어제만 쓰면 한 번 적은 값이 영영 낡습니다.
 */
export const DAILY_LOOKBACK_DAYS = 7;

/** PostgREST 한 번의 요청에 싣는 행 수. 백필 90일 × 이벤트 수십 종이 한 요청에 들어가지 않게 나눕니다. */
const UPSERT_BATCH_SIZE = 1000;

/**
 * 활성 사용자에서 extension_installed 만 보낸 사용자를 뺀 필터.
 *
 * 확장의 onInstalled 는 신규 설치뿐 아니라 업데이트에도 발화하는데, 예전 버전은 이유를 거르지
 * 않고 매번 extension_installed 를 보냈습니다. 그 이벤트도 engagement_time_msec 를 달고 있어서,
 * 배포 때마다 화면을 열지 않은 기존 사용자까지 활성 사용자로 잡혔습니다(9/11 이후 하루
 * 10명대가 100명대로 뛴 원인).
 *
 * 이미 나간 이벤트는 GA4 에서 지울 수 없으므로 조회에서 뺍니다. 다른 이벤트도 함께 보낸
 * 사용자는 그 이벤트로 그대로 세어집니다. 설치 직후 사이드패널을 열지 않은 진짜 신규
 * 설치자는 빠지지만, 이 그래프는 "실제로 쓰는 사람"을 보려는 것이라 그 편이 맞습니다.
 *
 * 호스트 허용 목록(HOST_NAME_FILTER)은 ga4-client.mjs 의 것을 씁니다. 활성 사용자에
 * customEvent:build_env 필터를 걸 수 없는 이유(gtag 자동 수집 기반)와 허용 목록이어야 하는 이유는
 * 거기 INCLUDED_HOST_NAMES 주석에 있습니다. 빈 문자열 호스트가 있어 inListFilter 한 줄로
 * 줄일 수 없습니다.
 */
export const ACTIVE_USERS_FILTER = {
	andGroup: {
		expressions: [
			HOST_NAME_FILTER,
			{
				notExpression: {
					filter: {
						fieldName: "eventName",
						stringFilter: { matchType: "EXACT", value: "extension_installed" },
					},
				},
			},
		],
	},
};

/** GA4 의 date 차원(YYYYMMDD)을 YYYY-MM-DD 로 바꿉니다. */
const toIsoDate = (rawDate) =>
	`${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

/**
 * 날짜×이벤트 runReport 행(readRows 결과, metrics = [activeUsers, eventCount])을 적재 행으로 바꿉니다.
 * 순수 함수입니다.
 */
export const buildEventSnapshotRows = (rows) =>
	rows.map(({ dimensions, metrics }) => ({
		date: toIsoDate(dimensions[0]),
		metric: dimensions[1],
		users: metrics[0],
		events: metrics[1],
	}));

/**
 * 날짜별 활성 사용자 runReport 행(readRows 결과, metrics = [activeUsers])을 적재 행으로 바꿉니다.
 * 이벤트 건수 개념이 없어 events 는 null 입니다. 순수 함수입니다.
 */
export const buildActiveUsersSnapshotRows = (rows) =>
	rows.map(({ dimensions, metrics }) => ({
		date: toIsoDate(dimensions[0]),
		metric: ACTIVE_USERS_METRIC,
		users: metrics[0],
		events: null,
	}));

/**
 * 한 번의 runReport 가 limit 에 걸려 잘리지 않도록 offset 으로 끝까지 읽습니다.
 * 잘린 채 넘어가면 에러 없이 이벤트가 덜 적재돼 그래프가 조용히 낮아집니다.
 */
const runPaginatedReport = async ({ accessToken, propertyId, body }) => {
	const rows = [];
	let offset = 0;

	for (;;) {
		const report = await runReport({
			accessToken,
			propertyId,
			body: { ...body, limit: REPORT_ROW_LIMIT, offset },
		});
		const page = readRows(report);

		rows.push(...page);
		offset += page.length;

		// rowCount 는 필터 후 전체 행 수입니다. 없으면 한 페이지가 덜 찼을 때를 끝으로 봅니다.
		const total = Number(report.rowCount);

		if (page.length === 0) break;
		if (Number.isFinite(total) ? offset >= total : page.length < REPORT_ROW_LIMIT) {
			break;
		}
	}

	return rows;
};

/** 기간의 이벤트별·활성 사용자 일별 지표를 GA4 에서 읽어 적재 행으로 돌려줍니다. */
export const fetchSnapshotRows = async ({
	accessToken,
	propertyId,
	startDate,
	endDate,
}) => {
	const dateRanges = [{ startDate, endDate }];
	const [eventRows, activeUserRows] = await Promise.all([
		runPaginatedReport({
			accessToken,
			propertyId,
			body: {
				dateRanges,
				dimensions: [{ name: "date" }, { name: "eventName" }],
				metrics: [{ name: "activeUsers" }, { name: "eventCount" }],
				dimensionFilter: PRODUCTION_FILTER,
				orderBys: [{ dimension: { dimensionName: "date" } }],
			},
		}),
		runPaginatedReport({
			accessToken,
			propertyId,
			body: {
				dateRanges,
				dimensions: [{ name: "date" }],
				metrics: [{ name: "activeUsers" }],
				dimensionFilter: ACTIVE_USERS_FILTER,
				orderBys: [{ dimension: { dimensionName: "date" } }],
			},
		}),
	]);

	return [
		...buildEventSnapshotRows(eventRows),
		...buildActiveUsersSnapshotRows(activeUserRows),
	];
};

/**
 * 행을 PostgREST 로 upsert 합니다. (date, metric) 충돌은 덮어씁니다.
 *
 * requestJson 을 쓰지 않습니다. return=minimal 응답은 본문이 비어 있어 json() 이 던집니다.
 * 한 요청이 실패하면 그 뒤 묶음은 보내지 않고 던집니다 — 반쯤 적재된 채 성공으로 보이지 않게.
 * 다시 돌리면 덮어쓰므로 중간에 끊겨도 재실행이 복구입니다.
 */
export const upsertSnapshotRows = async ({
	supabaseUrl,
	serviceRoleKey,
	rows,
}) => {
	for (let index = 0; index < rows.length; index += UPSERT_BATCH_SIZE) {
		const batch = rows.slice(index, index + UPSERT_BATCH_SIZE);
		const response = await fetch(
			`${supabaseUrl}/rest/v1/ga_daily_metrics?on_conflict=date,metric`,
			{
				method: "POST",
				headers: {
					apikey: serviceRoleKey,
					authorization: `Bearer ${serviceRoleKey}`,
					"content-type": "application/json",
					// 테이블이 memo 스키마에 있습니다. 빠뜨리면 public 에서 찾다가 404 가 납니다.
					"content-profile": "memo",
					prefer: "resolution=merge-duplicates,return=minimal",
				},
				body: JSON.stringify(
					batch.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
				),
			},
		);

		if (!response.ok) {
			const body = await response.text();

			throw new Error(
				`ga_daily_metrics 적재 실패 ${response.status} — ${body.slice(0, 500)}`,
			);
		}
	}

	return rows.length;
};

/** startDate ~ endDate 의 일별 지표를 GA4 에서 읽어 Supabase 에 적재합니다. 적재한 행 수를 돌려줍니다. */
export const snapshotDailyMetrics = async ({
	serviceAccountJson,
	propertyId,
	serviceRoleKey,
	startDate,
	endDate,
	supabaseUrl = readSupabaseUrl(),
}) => {
	const accessToken = await exchangeServiceAccountToken({
		serviceAccount: JSON.parse(serviceAccountJson),
		scope: GA4_SCOPE,
	});
	const rows = await fetchSnapshotRows({
		accessToken,
		propertyId,
		startDate,
		endDate,
	});

	return await upsertSnapshotRows({ supabaseUrl, serviceRoleKey, rows });
};

/** 데일리 적재 기간: 대상일 포함 DAILY_LOOKBACK_DAYS+1 일. */
export const resolveDailyRange = (targetDate) => ({
	startDate: shiftDate(targetDate, -DAILY_LOOKBACK_DAYS),
	endDate: targetDate,
});

const runCli = async () => {
	const { values } = parseArgs({
		options: { "backfill-days": { type: "string" } },
	});
	const days = Number(values["backfill-days"]);

	if (!Number.isInteger(days) || days < 1) {
		throw new Error("사용법: --backfill-days <1 이상의 정수>");
	}

	const endDate = resolveTargetDate();
	const startDate = shiftDate(endDate, -(days - 1));
	const count = await snapshotDailyMetrics({
		serviceAccountJson: requireEnv("GA4_SERVICE_ACCOUNT_JSON"),
		propertyId: requireEnv("GA4_PROPERTY_ID"),
		serviceRoleKey: requireEnv("SUPABASE_REPORT_SERVICE_ROLE_KEY"),
		startDate,
		endDate,
	});

	console.log(`ga_daily_metrics ${startDate} ~ ${endDate} ${count}행 적재`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await runCli();
}
