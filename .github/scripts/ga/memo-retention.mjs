/**
 * Supabase 에 저장된 메모·하이라이트로 주간 리텐션을 조회하고 요약합니다.
 *
 * GA 의 주간 활성 사용자는 "메모를 쓴 사람이 다음 주에도 쓰는가"에 답하지 못합니다.
 * 확장 이벤트는 Measurement Protocol 로 들어와 첫 방문일 판정도 믿기 어렵습니다.
 * 그래서 이 수치만은 GA 가 아니라 실제로 저장된 데이터에서 셉니다. 집계 정의(무엇을
 * 활동으로 보고 누구를 빼는지)는 SQL 함수 memo.weekly_creation_retention 이 원본입니다.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { requestJson } from "../shared/http.mjs";

/** 요약에 싣는 경과 주. 1·2주는 초기 이탈, 4주는 습관이 됐는지를 봅니다. */
export const RETENTION_OFFSETS = [1, 2, 4];

/** 대상 주를 포함해 몇 주 전 코호트까지 볼지. 4주 잔존을 볼 코호트가 다섯 개 남습니다. */
export const RETENTION_COHORT_WEEKS = 8;

const SUPABASE_CONFIG_PATH = fileURLToPath(
	new URL(
		"../../../packages/shared/src/constants/SupabaseConfig.ts",
		import.meta.url,
	),
);

/**
 * 프로젝트 URL 은 앱과 같은 상수를 런타임에 읽습니다. 베껴 두면 프로젝트를 옮길 때
 * 이 파일만 옛 주소를 친 채 401 로 조용히 리텐션이 빠집니다.
 */
export const readSupabaseUrl = () => {
	const source = readFileSync(SUPABASE_CONFIG_PATH, "utf8");
	const match = source.match(/url:\s*"(https:\/\/[^"]+\.supabase\.co)"/);

	if (!match) {
		throw new Error(`${SUPABASE_CONFIG_PATH} 에서 Supabase URL 을 찾지 못했습니다`);
	}

	return match[1];
};

/** 날짜 문자열(YYYY-MM-DD)에 일수를 더합니다. 시간대와 무관하게 UTC 로 계산합니다. */
const addDays = (dateString, days) =>
	new Date(Date.parse(`${dateString}T00:00:00Z`) + days * 86_400_000)
		.toISOString()
		.slice(0, 10);

/** 집계 RPC 를 호출해 (코호트 주, 경과 주)별 활성 사용자 행을 받습니다. */
export const fetchMemoRetentionRows = async ({
	supabaseUrl,
	serviceRoleKey,
	weekStart,
	weeks = RETENTION_COHORT_WEEKS,
}) =>
	requestJson(`${supabaseUrl}/rest/v1/rpc/weekly_creation_retention`, {
		method: "POST",
		headers: {
			apikey: serviceRoleKey,
			authorization: `Bearer ${serviceRoleKey}`,
			"content-type": "application/json",
			// 함수가 memo 스키마에 있습니다. 빠뜨리면 public 에서 찾다가 404 가 납니다.
			"content-profile": "memo",
		},
		body: JSON.stringify({ p_week_start: weekStart, p_weeks: weeks }),
	});

/**
 * RPC 행을 리포트용 요약으로 바꿉니다.
 *
 * 경과 주마다, 그만큼 시간이 지난 코호트만 모아 "잔존 인원 / 코호트 인원"을 냅니다.
 * 아직 관측할 수 없는 코호트(예: 지난주 코호트의 4주 잔존)를 모수에 넣으면 잔존율이
 * 실제보다 낮게 나옵니다. RPC 는 활성 사용자가 0명인 칸을 돌려주지 않으므로, 행이
 * 없으면 0명으로 읽습니다.
 */
export const summarizeRetention = ({ rows, weekStart }) => {
	const cohorts = new Map();

	for (const row of rows) {
		const cohort = cohorts.get(row.cohort_week) ?? {
			size: row.cohort_size,
			activeByOffset: new Map(),
		};

		cohort.activeByOffset.set(row.week_offset, row.active_users);
		cohorts.set(row.cohort_week, cohort);
	}

	const offsets = RETENTION_OFFSETS.map((offset) => {
		let cohortUsers = 0;
		let retainedUsers = 0;

		for (const [cohortWeek, cohort] of cohorts) {
			if (addDays(cohortWeek, offset * 7) > weekStart) {
				continue;
			}

			cohortUsers += cohort.size;
			retainedUsers += cohort.activeByOffset.get(offset) ?? 0;
		}

		return {
			offset,
			cohortUsers,
			retainedUsers,
			rate: cohortUsers > 0 ? retainedUsers / cohortUsers : null,
		};
	});

	return {
		newCreators: cohorts.get(weekStart)?.size ?? 0,
		offsets,
	};
};

/**
 * 리텐션을 조회해 요약합니다. 키가 없으면 null 을 돌려 리포트가 이 칸만 비우게 합니다.
 *
 * 키 누락은 실패가 아닙니다. 로컬 실행이나 포크처럼 시크릿이 없는 곳에서도 GA 리포트
 * 본체는 돌아야 합니다.
 */
export const fetchMemoRetention = async ({ serviceRoleKey, week }) => {
	if (!serviceRoleKey) {
		console.warn(
			"::warning::SUPABASE_REPORT_SERVICE_ROLE_KEY 가 없어 메모 리텐션을 건너뜁니다",
		);

		return null;
	}

	const rows = await fetchMemoRetentionRows({
		supabaseUrl: readSupabaseUrl(),
		serviceRoleKey,
		weekStart: week.start,
	});

	return summarizeRetention({ rows, weekStart: week.start });
};
