import { SUPABASE } from "../constants";
import type { MemoSupabaseClient, BookmarkedMemo } from "../types";

export class BookmarkService {
	constructor(private readonly supabaseClient: MemoSupabaseClient) {}

	bookmarkMemo = async (memoId: number, userId: string) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_bookmarks")
			.insert({ memo_id: memoId, user_id: userId })
			.select()
			.single();
	};

	unbookmarkMemo = async (memoId: number, userId: string) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_bookmarks")
			.delete()
			.eq("memo_id", memoId)
			.eq("user_id", userId);
	};

	isBookmarked = async (memoId: number, userId: string) => {
		const { data, error } = await this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_bookmarks")
			.select("id")
			.eq("memo_id", memoId)
			.eq("user_id", userId)
			.maybeSingle();

		if (error) {
			return { data: false, error };
		}

		return { data: !!data, error: null };
	};

	getBookmarkedMemos = async ({
		userId,
		cursor,
		limit = 20,
	}: {
		userId: string;
		cursor?: string;
		limit?: number;
	}) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_bookmarked_memos" as never, {
				p_user_id: userId,
				p_limit: limit,
				p_cursor: cursor || null,
			} as never) as unknown as Promise<{
			data: BookmarkedMemo[] | null;
			error: Error | null;
		}>;
	};
}
