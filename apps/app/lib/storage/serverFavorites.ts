import type { TFavoriteRow } from "@web-memo/shared/utils/services";
import { favoriteService } from "@/lib/supabase/client";
import type { Favorite } from "./favorites";

const toFavorite = (row: TFavoriteRow): Favorite => ({
	id: String(row.id),
	url: row.url,
	title: row.title,
	favIconUrl: row.favIconUrl ?? undefined,
	createdAt: row.created_at,
});

/** 로그인한 계정의 즐겨찾기를 최신순으로 가져온다. */
export const getServerFavorites = async (): Promise<Favorite[]> => {
	const { data, error } = await favoriteService.getFavorites();
	if (error) {
		throw error;
	}

	return (data ?? []).map(toFavorite);
};

/** 로그인한 계정에 해당 페이지가 즐겨찾기돼 있는지 확인한다. */
export const isServerFavorite = async (url: string): Promise<boolean> => {
	const { data, error } = await favoriteService.getFavoriteByUrl(url);
	if (error) {
		throw error;
	}

	return data !== null;
};

/** 로그인한 계정에 즐겨찾기를 추가한다. 이미 있으면 그대로 둔다. */
export const addServerFavorite = async ({
	userId,
	url,
	title,
	favIconUrl,
}: {
	userId: string;
	url: string;
	title: string;
	favIconUrl?: string;
}) => {
	const { error } = await favoriteService.addFavorites({
		userId,
		favorites: [{ url, title, favIconUrl }],
	});
	if (error) {
		throw error;
	}
};

/** 로그인한 계정에서 즐겨찾기를 삭제한다. */
export const removeServerFavorite = async (url: string) => {
	const { error } = await favoriteService.removeFavoriteByUrl(url);
	if (error) {
		throw error;
	}
};
