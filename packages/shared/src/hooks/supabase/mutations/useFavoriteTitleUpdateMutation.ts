import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { FavoriteService, type TFavoriteRow } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";
import {
	type IFFavoriteMutationContext,
	restoreFavoritesCache,
	updateFavoritesCache,
} from "./favoriteCache";

interface IFVariables {
	id: TFavoriteRow["id"];
	title: string;
}

/** 즐겨찾기 제목을 바꾼다. 목록에는 먼저 반영하고 실패하면 되돌린다. */
export default function useFavoriteTitleUpdateMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<
		TFavoriteRow,
		Error,
		IFVariables,
		IFFavoriteMutationContext
	>({
		meta: {
			feature: "favorite",
			operation: "update-title",
			stage: "save",
		},
		mutationFn: async ({ id, title }) => {
			const { data, error } = await new FavoriteService(
				supabaseClient,
			).updateFavoriteTitle(id, title);

			if (error) {
				throw error;
			}

			return data;
		},
		onMutate: ({ id, title }) =>
			updateFavoritesCache(queryClient, (favorites) =>
				favorites.map((favorite) =>
					favorite.id === id ? { ...favorite, title: title.trim() } : favorite,
				),
			),
		onError: (_error, _variables, context) =>
			restoreFavoritesCache(queryClient, context),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.favorites() }),
	});
}
