import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "../../../constants";
import { FavoriteService, type TFavoriteRow } from "../../../utils";
import { useSupabaseClientQuery } from "../queries";
import {
	type IFFavoriteMutationContext,
	restoreFavoritesCache,
	updateFavoritesCache,
} from "./favoriteCache";

/** 즐겨찾기를 삭제한다. 목록에서는 먼저 지우고 실패하면 되돌린다. */
export default function useFavoriteDeleteMutation() {
	const queryClient = useQueryClient();
	const { data: supabaseClient } = useSupabaseClientQuery();

	return useMutation<
		void,
		Error,
		TFavoriteRow["id"],
		IFFavoriteMutationContext
	>({
		meta: {
			feature: "favorite",
			operation: "delete",
			stage: "save",
		},
		mutationFn: async (id) => {
			const { error } = await new FavoriteService(
				supabaseClient,
			).removeFavoriteById(id);

			if (error) {
				throw error;
			}
		},
		onMutate: (id) =>
			updateFavoritesCache(queryClient, (favorites) =>
				favorites.filter((favorite) => favorite.id !== id),
			),
		onError: (_error, _id, context) =>
			restoreFavoritesCache(queryClient, context),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.favorites() }),
	});
}
