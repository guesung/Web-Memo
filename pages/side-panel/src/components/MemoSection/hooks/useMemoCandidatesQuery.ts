import { useQuery } from "@tanstack/react-query";
import {
	memoQueryOptions,
	samePathMemoQueryOptions,
	useSupabaseClientQuery,
} from "@web-memo/shared/hooks";

/** 현재 탭 URL의 메모 후보와 같은 경로 후보를 조회하는 입력. */
interface IFUseMemoCandidatesQueryProps {
	url: string;
}

/**
 * 현재 페이지의 메모 후보와 같은 경로 후보를 Suspense 없이 조회하고, 편집 잠금 상태를 계산한다.
 *
 * @description Suspense로 읽으면 탭 전환마다 폼 전체가 스켈레톤으로 바뀐다. 두 조회 중 하나라도
 * 데이터가 없으면(대기 또는 데이터 없이 실패) 잠근다. 캐시 데이터가 있는데 백그라운드 갱신만
 * 실패한 경우는 잠그지 않는다. 다시 시도로 재조회하는 동안은 실패가 아니라 대기로 본다.
 */
export default function useMemoCandidatesQuery({
	url,
}: IFUseMemoCandidatesQueryProps) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoQuery = useQuery({
		...memoQueryOptions({ supabaseClient, url }),
		// MemoSection이 같은 키를 이미 prefetch했으므로 마운트 때 한 번 더 조회하지 않는다.
		refetchOnMount: false,
	});
	const samePathMemoQuery = useQuery({
		...samePathMemoQueryOptions({ supabaseClient, url }),
		refetchOnMount: false,
	});

	// queryFn이 응답의 error를 throw하지만, 캐시에 이미 담긴 error 응답도 실패로 본다.
	const hasResponseError =
		Boolean(memoQuery.data?.error) || Boolean(samePathMemoQuery.data?.error);
	const isDataMissing =
		memoQuery.data === undefined || samePathMemoQuery.data === undefined;
	const isMemoLocked = isDataMissing || hasResponseError;
	const isFetching = memoQuery.isFetching || samePathMemoQuery.isFetching;
	const isMemoLoadFailed =
		isMemoLocked &&
		!isFetching &&
		(hasResponseError || memoQuery.isError || samePathMemoQuery.isError);

	const refetchMemoCandidates = async () => {
		await Promise.all([memoQuery.refetch(), samePathMemoQuery.refetch()]);
	};

	return {
		memos: memoQuery.data?.data ?? [],
		samePathMemos: samePathMemoQuery.data?.data ?? [],
		/** 두 조회 중 하나라도 데이터가 없거나 오류 응답이면 켜진다. 켜져 있으면 편집·저장·후보 선택을 막는다. */
		isMemoLocked,
		/** 재조회 중이 아니면서 데이터 없이 실패했는지. 다시 시도 UI를 보여줄 때 쓴다. */
		isMemoLoadFailed,
		refetchMemoCandidates,
	};
}
