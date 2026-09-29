import { SUPABASE } from "../../constants";
import type { FavoriteTable, MemoSupabaseClient } from "../../types";
import { getPageKey } from "../Url";

/** 즐겨찾기 저장에 필요한 값. */
export interface IFFavoriteInput {
	url: string;
	title: string;
	favIconUrl?: string | null;
	createdAt?: string;
}

/** 계정에 저장되는 즐겨찾기(URL 북마크)의 조회·저장·삭제를 담당한다. RLS가 소유권을 제한한다. */
export class FavoriteService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	private get table() {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from(SUPABASE.table.favorite);
	}

	/** 즐겨찾기를 최신순으로 모두 가져온다. */
	getFavorites = async () =>
		this.table.select("*").order("created_at", { ascending: false });

	/** 페이지 식별값이 같은 즐겨찾기가 있는지 확인한다. */
	getFavoriteByUrl = async (url: string) =>
		this.table.select("*").eq("page_key", getPageKey(url)).maybeSingle();

	/** 이미 저장된 페이지는 덮어쓰지 않고 그대로 둔다. */
	addFavorites = async ({
		userId,
		favorites,
	}: {
		userId: string;
		favorites: IFFavoriteInput[];
	}) =>
		this.table.upsert(
			favorites.map((favorite) => ({
				user_id: userId,
				url: favorite.url,
				page_key: getPageKey(favorite.url),
				title: favorite.title,
				favIconUrl: favorite.favIconUrl ?? null,
				...(favorite.createdAt ? { created_at: favorite.createdAt } : {}),
			})),
			{ onConflict: "user_id,page_key", ignoreDuplicates: true },
		);

	/** 페이지 식별값이 같은 즐겨찾기를 삭제한다. */
	removeFavoriteByUrl = async (url: string) =>
		this.table.delete().eq("page_key", getPageKey(url));
}

/** 즐겨찾기 행 타입. */
export type TFavoriteRow = FavoriteTable["Row"];
