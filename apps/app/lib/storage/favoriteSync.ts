import { favoriteService, supabase } from "@/lib/supabase/client";
import { clearLocalFavorites, getAllFavorites } from "./favorites";

/**
 * 로그인 전에 기기에 쌓인 즐겨찾기를 계정으로 옮긴다.
 * 서버 저장에 성공했을 때만 로컬을 비운다. 이미 서버에 있는 페이지는 덮어쓰지 않는다.
 */
export const syncFavoritesToSupabase = async (): Promise<{
	synced: number;
}> => {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) {
		return { synced: 0 };
	}

	const localFavorites = await getAllFavorites();
	if (localFavorites.length === 0) {
		return { synced: 0 };
	}

	const { error } = await favoriteService.addFavorites({
		userId: session.user.id,
		favorites: localFavorites,
	});
	if (error) {
		throw error;
	}

	await clearLocalFavorites();

	return { synced: localFavorites.length };
};
