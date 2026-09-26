import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { MemoSupabaseClient } from "../../../types";
import { isExtension } from "../../../utils/Environment";
import {
	getSupabaseClient as getSupabaseClientExtension,
	SupabaseSessionRequiredError,
} from "../../../utils/extension";
import { getSupabaseClient as getSupabaseClientWeb } from "../../../utils/web";

const MAX_RETRY_COUNT = 3;

/**
 * Supabase 클라이언트 쿼리의 재시도 여부를 판단한다.
 *
 * @description 로그인 쿠키가 없는 상태는 기다려도 달라지지 않으므로 재시도하지 않는다.
 * 재시도하면 로그아웃 사용자가 로그인 화면 대신 스켈레톤을 7초가량 보게 된다.
 * 세션 복원 실패처럼 일시적일 수 있는 오류는 기존처럼 재시도한다.
 */
export const shouldRetrySupabaseClient = (
	failureCount: number,
	error: Error,
): boolean => {
	if (error instanceof SupabaseSessionRequiredError) {
		return false;
	}

	return failureCount < MAX_RETRY_COUNT;
};

/** Supabase 클라이언트 준비의 queryKey·queryFn을 만든다. Suspense 밖에서 ensureQueryData로 확보할 때 쓴다. */
export const supabaseClientQueryOptions = () =>
	queryOptions({
		queryFn: isExtension() ? getSupabaseClientExtension : getSupabaseClientWeb,
		queryKey: QUERY_KEY.supabaseClient(),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
		retry: shouldRetrySupabaseClient,
	});

export default function useSupabaseClientQuery() {
	const query = useSuspenseQuery(supabaseClientQueryOptions());

	return {
		...query,
		data: query.data as MemoSupabaseClient,
	};
}
