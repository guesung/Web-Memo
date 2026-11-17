import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { getPageKey, type IFMemoStore } from "../../../utils";

import useMemoStoreQuery from "./useMemoStoreQuery";

/** ID 또는 페이지 URL로 메모 후보를 조회하는 입력. */
interface IFUseMemoQueryProps {
	url?: string;
	id?: number;
}

/** memoQueryOptions의 인자 */
interface IFMemoQueryOptionsParams extends IFUseMemoQueryProps {
	memoStore: IFMemoStore;
}

/**
 * 메모 후보 조회의 queryKey·queryFn을 만든다.
 *
 * @description useMemoQuery와 같은 키·조회 함수를 공유해, Suspense 밖에서 prefetch하거나
 * 비-Suspense(useQuery)로 읽어도 같은 캐시를 쓰게 한다. 응답의 error는 throw해 실패로 다룬다.
 */
export const memoQueryOptions = ({
	memoStore,
	url,
	id,
}: IFMemoQueryOptionsParams) => {
	const pageKey = url ? getPageKey(url) : undefined;

	return queryOptions({
		queryFn: async () => {
			if (id) {
				const result = await memoStore.getMemoById(id);
				if (result.error) {
					throw result.error;
				}

				return result;
			}
			if (url) {
				const result = await memoStore.getMemoByUrl(url);
				if (result.error) {
					throw result.error;
				}

				return result;
			}
			return { data: [], error: null };
		},
		queryKey: QUERY_KEY.memo({
			url: pageKey,
			id,
			...(memoStore.kind === "local" && { store: "local" as const }),
		}),
		// 기기 저장소는 네트워크가 필요 없다. 기본값이면 오프라인에서 조회가 일시정지돼 저장한 메모가 보이지 않는다.
		networkMode: memoStore.kind === "local" ? "always" : "online",
	});
};

/** 같은 페이지의 모든 후보를 반환하며, 한 건일 때만 편집 대상 메모를 지정한다. */
export default function useMemoQuery({ url, id }: IFUseMemoQueryProps) {
	const { data: memoStore } = useMemoStoreQuery();

	const query = useSuspenseQuery(memoQueryOptions({ memoStore, url, id }));

	return {
		...query,
		memos: query.data?.data ?? [],
		memo: query.data?.data?.length === 1 ? query.data.data[0] : undefined,
	};
}
