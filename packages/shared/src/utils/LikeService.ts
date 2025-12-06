import { SUPABASE } from "../constants";
import type { MemoSupabaseClient } from "../types";

export class LikeService {
	constructor(private readonly supabaseClient: MemoSupabaseClient) {}

	likeMemo = async (memoId: number, userId: string) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_likes")
			.insert({ memo_id: memoId, user_id: userId })
			.select()
			.single();
	};

	unlikeMemo = async (memoId: number, userId: string) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_likes")
			.delete()
			.eq("memo_id", memoId)
			.eq("user_id", userId);
	};

	isLiked = async (memoId: number, userId: string) => {
		const { data, error } = await this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_likes")
			.select("id")
			.eq("memo_id", memoId)
			.eq("user_id", userId)
			.maybeSingle();

		if (error) {
			return { data: false, error };
		}

		return { data: !!data, error: null };
	};

	getLikeCount = async (memoId: number) => {
		const { count, error } = await this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_likes")
			.select("*", { count: "exact", head: true })
			.eq("memo_id", memoId);

		return { data: count ?? 0, error };
	};
}
