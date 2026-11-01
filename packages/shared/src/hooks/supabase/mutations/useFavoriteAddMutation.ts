import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import {
	FavoriteService,
	resolveFavoriteTitle,
	type TFavoriteRow,
} from "../../../utils";
import { useSupabaseClientQuery, useSupabaseUserQuery } from "../queries";

interface IFVariables {
	/** `normalizeFavoriteUrl`을 거친 URL */
	url: string;
	/** 비어 있으면 도메인으로 저장한다 */
	title: string;
}

/** 즐겨찾기를 추가한다. 응답을 받은 뒤에 목록 맨 위에 넣는다. 중복이면 `isFavoriteDuplicateError`로 판별한다. */
export default function useFavoriteAddMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();
	const { user } = useSupabaseUserQuery();
	const userId = user.data.user?.id;

	return useMutation<TFavoriteRow, Error, IFVariables>({
		meta: {
			feature: "favorite",
			operation: "add",
			stage: "save",
		},
		mutationFn: async ({ url, title }) => {
			if (!userId) {
				throw new Error("로그인한 사용자를 찾을 수 없습니다");
			}

			const { data, error } = await new FavoriteService(
				supabaseClient,
			).addFavorite({
				userId,
				url,
				title: resolveFavoriteTitle(url, title),
			});

			if (error) {
				throw error;
			}

			return data;
		},
		onSuccess: (favorite) =>
			queryClient.setQueryData<TFavoriteRow[]>(
				QUERY_KEY.favorites(),
				(favorites) => (favorites ? [favorite, ...favorites] : favorites),
			),
	});
}
