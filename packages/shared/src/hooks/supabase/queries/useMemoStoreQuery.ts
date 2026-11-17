import {
	type QueryClient,
	queryOptions,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import {
	type IFMemoStore,
	LocalMemoService,
	MemoService,
} from "../../../utils";
import { isExtension } from "../../../utils/Environment";
import { SupabaseSessionRequiredError } from "../../../utils/extension";
import { supabaseClientQueryOptions } from "./useSupabaseClientQuery";

/**
 * 로그인 여부로 메모 저장소를 고른다.
 * @description 확장에서 세션이 없으면 기기 저장소를, 세션이 있거나 웹이면 서버 저장소를 쓴다.
 * 세션 복원이 일시적으로 실패한 경우처럼 로그인 필요 오류가 아닌 실패는 기기 저장소로 돌리지 않고 그대로 던진다.
 * 훅마다 분기를 두지 않도록 선택은 여기 한 곳에서만 한다.
 */
const selectMemoStore = async (
	queryClient: QueryClient,
): Promise<IFMemoStore> => {
	try {
		const supabaseClient = await queryClient.ensureQueryData(
			supabaseClientQueryOptions(),
		);
		return new MemoService(supabaseClient);
	} catch (error) {
		if (isExtension() && error instanceof SupabaseSessionRequiredError) {
			return new LocalMemoService();
		}
		throw error;
	}
};

/** 메모 저장소 선택의 queryKey·queryFn을 만든다. Suspense 밖에서 ensureQueryData로 확보할 때 쓴다. */
export const memoStoreQueryOptions = (queryClient: QueryClient) =>
	queryOptions({
		queryFn: () => selectMemoStore(queryClient),
		queryKey: QUERY_KEY.memoStore(),
		// 서버 저장소는 세션이 유지되는 동안 그대로 쓴다. 기기 저장소는 로그인하면 바뀌므로 캐시하지 않는다.
		staleTime: (query) =>
			query.state.data?.kind === "remote" ? Number.POSITIVE_INFINITY : 0,
		gcTime: Number.POSITIVE_INFINITY,
		// 세션 복원 재시도는 supabaseClient 쿼리가 이미 한다.
		retry: false,
	});

/** 현재 로그인 여부에 맞는 메모 저장소를 반환한다. 사이드 패널 메모 경로는 이 훅으로 저장소를 받는다. */
export default function useMemoStoreQuery() {
	const { data } = useSuspenseQuery(memoStoreQueryOptions(useQueryClient()));

	return { data };
}
