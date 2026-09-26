import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { getPathKey, MemoService } from "../../../utils";

import useSupabaseClientQuery from "./useSupabaseClientQuery";

/** 같은 경로의 메모 후보를 조회하는 입력. */
interface IFUseSamePathMemoQueryProps {
	/** 현재 탭 URL. 비어 있거나 파싱할 수 없으면 조회하지 않는다 */
	url: string;
}

/**
 * 쿼리만 다른 주소까지 포함해 같은 경로의 메모 후보를 조회한다.
 * @description 사이드 패널이 현재 URL에 메모가 없을 때 다른 주소의 메모를 고를 수 있게 하는 용도다.
 */
export default function useSamePathMemoQuery({
	url,
}: IFUseSamePathMemoQueryProps) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const memoService = new MemoService(supabaseClient);

	const pathKey = getSafePathKey(url);

	const query = useSuspenseQuery({
		queryFn: async () => {
			if (!pathKey) {
				return { data: [], error: null };
			}

			const result = await memoService.getMemosBySamePath(url);

			if (result.error) {
				throw result.error;
			}

			return result;
		},
		queryKey: QUERY_KEY.samePathMemos(pathKey ?? ""),
	});

	return {
		...query,
		memos: query.data?.data ?? [],
	};
}

const getSafePathKey = (url: string) => {
	if (!url) {
		return null;
	}

	try {
		return getPathKey(url);
	} catch {
		return null;
	}
};
