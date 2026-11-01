import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import type { TFavoriteRow } from "../../../utils";

/** 낙관적 갱신 전에 저장해 두는 즐겨찾기 목록 스냅샷. 롤백에 쓴다. */
export interface IFFavoriteMutationContext {
	previousFavorites?: TFavoriteRow[];
}

/**
 * 즐겨찾기 목록 캐시를 `update`로 바꾸고 롤백용 스냅샷을 돌려준다.
 *
 * @description 진행 중인 재조회가 낙관적 값을 옛 응답으로 덮어쓰지 않게 먼저 멈춘다.
 */
export async function updateFavoritesCache(
	queryClient: QueryClient,
	update: (favorites: TFavoriteRow[]) => TFavoriteRow[],
): Promise<IFFavoriteMutationContext> {
	await queryClient.cancelQueries({ queryKey: QUERY_KEY.favorites() });
	const previousFavorites = queryClient.getQueryData<TFavoriteRow[]>(
		QUERY_KEY.favorites(),
	);
	queryClient.setQueryData<TFavoriteRow[]>(QUERY_KEY.favorites(), (current) =>
		current ? update(current) : current,
	);

	return { previousFavorites };
}

/** 스냅샷이 있으면 목록 캐시를 되돌린다. */
export function restoreFavoritesCache(
	queryClient: QueryClient,
	context: IFFavoriteMutationContext | undefined,
) {
	if (context?.previousFavorites) {
		queryClient.setQueryData(QUERY_KEY.favorites(), context.previousFavorites);
	}
}
