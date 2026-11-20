import {
	type QueryClient,
	queryOptions,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import {
	HighlightService,
	type IFHighlightStore,
	LocalHighlightService,
} from "../../../utils";
import { isExtension } from "../../../utils/Environment";
import { SupabaseSessionRequiredError } from "../../../utils/extension";
import { supabaseClientQueryOptions } from "./useSupabaseClientQuery";

/**
 * 로그인 여부로 하이라이트 저장소를 고른다. 메모 저장소({@link memoStoreQueryOptions})와 같은 기준이다.
 * @description 확장에서 세션이 없으면 기기 저장소를, 세션이 있으면 서버 저장소를 쓴다.
 * 로그인 필요 오류가 아닌 실패는 기기 저장소로 돌리지 않고 그대로 던진다.
 */
const selectHighlightStore = async (
	queryClient: QueryClient,
): Promise<IFHighlightStore> => {
	try {
		const supabaseClient = await queryClient.ensureQueryData(
			supabaseClientQueryOptions(),
		);
		return new HighlightService(supabaseClient);
	} catch (error) {
		if (isExtension() && error instanceof SupabaseSessionRequiredError) {
			return new LocalHighlightService();
		}
		throw error;
	}
};

/** 하이라이트 저장소 선택의 queryKey·queryFn을 만든다. */
export const highlightStoreQueryOptions = (queryClient: QueryClient) =>
	queryOptions({
		queryFn: () => selectHighlightStore(queryClient),
		queryKey: QUERY_KEY.highlightStore(),
		// 서버 저장소는 세션이 유지되는 동안 그대로 쓴다. 기기 저장소는 로그인하면 바뀌므로 캐시하지 않는다.
		staleTime: (query) =>
			query.state.data?.kind === "remote" ? Number.POSITIVE_INFINITY : 0,
		gcTime: Number.POSITIVE_INFINITY,
		retry: false,
	});

/** 현재 로그인 여부에 맞는 하이라이트 저장소를 반환한다. */
export default function useHighlightStoreQuery() {
	const { data } = useSuspenseQuery(
		highlightStoreQueryOptions(useQueryClient()),
	);

	return { data };
}
