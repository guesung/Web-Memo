import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import {
	FavoriteService,
	resolveFavoriteTitle,
	type TFavoriteRow,
} from "../../../utils";
import { useSupabaseClientQuery } from "../queries";

interface IFVariables {
	id: TFavoriteRow["id"];
	/** `normalizeFavoriteUrl`을 거친 URL */
	url: string;
	/** 비어 있으면 도메인으로 저장한다 */
	title: string;
	/** 수정 전 URL. 도메인이 바뀌었는지 보고 파비콘을 비운다 */
	previousUrl: string;
}

/** 즐겨찾기의 URL·제목을 바꾼다. 응답을 받은 뒤에 목록의 해당 행을 교체한다. 중복이면 `isFavoriteDuplicateError`로 판별한다. */
export default function useFavoriteUpdateMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<TFavoriteRow, Error, IFVariables>({
		meta: {
			feature: "favorite",
			operation: "update",
			stage: "save",
		},
		mutationFn: async ({ id, url, title, previousUrl }) => {
			const { data, error } = await new FavoriteService(
				supabaseClient,
			).updateFavorite(id, {
				url,
				title: resolveFavoriteTitle(url, title),
				previousUrl,
			});

			if (error) {
				throw error;
			}

			return data;
		},
		onSuccess: (updated) =>
			queryClient.setQueryData<TFavoriteRow[]>(
				QUERY_KEY.favorites(),
				(favorites) =>
					favorites?.map((favorite) =>
						favorite.id === updated.id ? updated : favorite,
					),
			),
	});
}
