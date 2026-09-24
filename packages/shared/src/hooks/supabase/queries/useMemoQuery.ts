import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { getPageKey, MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** ID 또는 페이지 URL로 메모 후보를 조회하는 입력. */
interface IFUseMemoQueryProps {
	url?: string;
	id?: number;
}

/** 같은 페이지의 모든 후보를 반환하며, 한 건일 때만 편집 대상 메모를 지정한다. */
export default function useMemoQuery({ url, id }: IFUseMemoQueryProps) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = new MemoService(supabaseClient);

	const pageKey = url ? getPageKey(url) : undefined;

	const query = useSuspenseQuery({
		queryFn: async () => {
			if (id) {
				const result = await memoService.getMemoById(id);
				if (result.error) {
					throw result.error;
				}

				return result;
			}
			if (url) {
				const result = await memoService.getMemoByUrl(url);
				if (result.error) {
					throw result.error;
				}

				return result;
			}
			return { data: [], error: null };
		},
		queryKey: QUERY_KEY.memo({ url: pageKey, id }),
	});

	return {
		...query,
		memos: query.data?.data ?? [],
		memo: query.data?.data?.length === 1 ? query.data.data[0] : undefined,
	};
}
