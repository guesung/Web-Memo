import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
	addFavorite,
	getAllFavorites,
	isFavorite,
	removeFavorite,
} from "@/lib/storage/favorites";
import {
	addServerFavorite,
	getServerFavorites,
	isServerFavorite,
	removeServerFavorite,
} from "@/lib/storage/serverFavorites";

const FAVORITES_KEY = ["favorites"];

interface IFFavoriteParams {
	url: string;
	title: string;
	favIconUrl?: string;
}

/** 로그인하면 계정에, 아니면 기기에 저장된 즐겨찾기 목록을 가져온다. */
export const useFavorites = () => {
	const { session } = useAuth();
	const userId = session?.user.id ?? null;

	return useQuery({
		queryKey: [...FAVORITES_KEY, "list", userId],
		queryFn: userId ? getServerFavorites : getAllFavorites,
	});
};

/** 해당 URL이 즐겨찾기돼 있는지 확인한다. */
export const useIsFavorite = (url: string) => {
	const { session } = useAuth();
	const userId = session?.user.id ?? null;

	return useQuery({
		queryKey: [...FAVORITES_KEY, "check", userId, url],
		queryFn: () => (userId ? isServerFavorite(url) : isFavorite(url)),
		enabled: !!url,
	});
};

/** 즐겨찾기를 추가한다. */
export const useFavoriteAdd = () => {
	const queryClient = useQueryClient();
	const { session } = useAuth();
	const userId = session?.user.id ?? null;

	return useMutation({
		mutationFn: async (params: IFFavoriteParams) => {
			if (userId) {
				await addServerFavorite({ userId, ...params });
				return;
			}
			await addFavorite(params);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
		},
	});
};

/** 즐겨찾기를 URL로 삭제한다. */
export const useFavoriteRemove = () => {
	const queryClient = useQueryClient();
	const { session } = useAuth();
	const userId = session?.user.id ?? null;

	return useMutation({
		mutationFn: (url: string) =>
			userId ? removeServerFavorite(url) : removeFavorite(url),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
		},
	});
};

/** 현재 상태에 따라 즐겨찾기를 추가하거나 삭제한다. */
export const useFavoriteToggle = () => {
	const queryClient = useQueryClient();
	const { session } = useAuth();
	const userId = session?.user.id ?? null;

	return useMutation({
		mutationFn: async ({
			currentIsFavorite,
			...params
		}: IFFavoriteParams & { currentIsFavorite: boolean }) => {
			if (currentIsFavorite) {
				await (userId
					? removeServerFavorite(params.url)
					: removeFavorite(params.url));
				return;
			}
			await (userId
				? addServerFavorite({ userId, ...params })
				: addFavorite(params));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
		},
	});
};
