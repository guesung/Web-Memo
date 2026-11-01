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

const FAVORITE_UNIQUE_VIOLATION_CODE = "23505";
const FAVORITE_UNIQUE_CONSTRAINT = "favorite_user_page_key_unique";

/** insert·update 오류가 같은 페이지의 즐겨찾기가 이미 있어서 난 것인지 판별한다. */
export const isFavoriteDuplicateError = (
	error:
		| { code?: string; message?: string; details?: string }
		| null
		| undefined,
): boolean =>
	error?.code === FAVORITE_UNIQUE_VIOLATION_CODE &&
	[error.message, error.details].some((text) =>
		text?.includes(FAVORITE_UNIQUE_CONSTRAINT),
	);

const getHostname = (url: string): string | null => {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
};

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

	/**
	 * 즐겨찾기를 한 건 추가하고 만든 행을 돌려준다. 이미 있는 페이지면 upsert하지 않고 오류를 낸다
	 * (`isFavoriteDuplicateError`로 판별). 제목은 trim해서 저장한다.
	 */
	addFavorite = async ({
		userId,
		url,
		title,
	}: {
		userId: string;
		url: string;
		title: string;
	}) =>
		this.table
			.insert({
				user_id: userId,
				url,
				page_key: getPageKey(url),
				title: title.trim(),
				favIconUrl: null,
			})
			.select()
			.single();

	/**
	 * id로 즐겨찾기의 URL·제목을 함께 바꾸고 갱신된 행을 돌려준다. page_key를 다시 계산하며,
	 * 호스트가 previousUrl과 달라지면 저장된 파비콘을 비운다. 중복이면 `isFavoriteDuplicateError`로 판별한다.
	 */
	updateFavorite = async (
		id: number,
		{
			url,
			title,
			previousUrl,
		}: { url: string; title: string; previousUrl: string },
	) =>
		this.table
			.update({
				url,
				page_key: getPageKey(url),
				title: title.trim(),
				...(getHostname(url) !== getHostname(previousUrl)
					? { favIconUrl: null }
					: {}),
			})
			.eq("id", id)
			.select()
			.single();

	/** id로 즐겨찾기를 삭제한다. */
	removeFavoriteById = async (id: number) => this.table.delete().eq("id", id);
}

/** 즐겨찾기 행 타입. */
export type TFavoriteRow = FavoriteTable["Row"];
