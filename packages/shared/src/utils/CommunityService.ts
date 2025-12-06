import { SUPABASE } from "../constants";
import type {
	MemoSupabaseClient,
	MemoRow,
	PublicMemo,
} from "../types";

export class CommunityService {
	constructor(private readonly supabaseClient: MemoSupabaseClient) {}

	getPublicMemos = async ({
		cursor,
		limit = 20,
		userId,
		currentUserId,
	}: {
		cursor?: string;
		limit?: number;
		userId?: string;
		currentUserId?: string;
	}) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_public_memos" as never, {
				p_limit: limit,
				p_cursor: cursor || null,
				p_user_id: userId || null,
				p_current_user_id: currentUserId || null,
			} as never) as unknown as Promise<{ data: PublicMemo[] | null; error: Error | null }>;
	};

	getPublicMemoById = async (id: number, currentUserId?: string) => {
		const { data, error } = await this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from(SUPABASE.table.memo)
			.select("*, profiles:user_id(nickname, avatar_url)")
			.eq("id", id)
			.eq("is_public", true)
			.single();

		if (error) {
			return { data: null, error };
		}

		const memo = data as unknown as MemoRow & {
			profiles: { nickname: string | null; avatar_url: string | null } | null;
		};

		let isLiked = false;
		let isBookmarked = false;

		if (currentUserId) {
			const [likeResult, bookmarkResult] = await Promise.all([
				this.supabaseClient
					.schema(SUPABASE.schema.memo)
					.from("memo_likes")
					.select("id")
					.eq("memo_id", id)
					.eq("user_id", currentUserId)
					.maybeSingle(),
				this.supabaseClient
					.schema(SUPABASE.schema.memo)
					.from("memo_bookmarks")
					.select("id")
					.eq("memo_id", id)
					.eq("user_id", currentUserId)
					.maybeSingle(),
			]);

			isLiked = !!likeResult.data;
			isBookmarked = !!bookmarkResult.data;
		}

		const [likeCountResult, bookmarkCountResult, commentCountResult] = await Promise.all([
			this.supabaseClient
				.schema(SUPABASE.schema.memo)
				.from("memo_likes")
				.select("id", { count: "exact", head: true })
				.eq("memo_id", id),
			this.supabaseClient
				.schema(SUPABASE.schema.memo)
				.from("memo_bookmarks")
				.select("id", { count: "exact", head: true })
				.eq("memo_id", id),
			this.supabaseClient
				.schema(SUPABASE.schema.memo)
				.from("memo_comments")
				.select("id", { count: "exact", head: true })
				.eq("memo_id", id),
		]);

		const publicMemo: PublicMemo = {
			id: memo.id,
			title: memo.title,
			memo: memo.memo,
			url: memo.url,
			fav_icon_url: memo.favIconUrl,
			user_id: memo.user_id,
			is_public: memo.is_public ?? false,
			shared_at: memo.shared_at,
			created_at: memo.created_at,
			author_nickname: memo.profiles?.nickname ?? null,
			author_avatar_url: memo.profiles?.avatar_url ?? null,
			like_count: likeCountResult.count ?? 0,
			bookmark_count: bookmarkCountResult.count ?? 0,
			comment_count: commentCountResult.count ?? 0,
			is_liked: isLiked,
			is_bookmarked: isBookmarked,
		};

		return { data: publicMemo, error: null };
	};

	shareMemo = async (id: MemoRow["id"]) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from(SUPABASE.table.memo)
			.update({ is_public: true, shared_at: new Date().toISOString() })
			.eq("id", id)
			.select();
	};

	unshareMemo = async (id: MemoRow["id"]) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from(SUPABASE.table.memo)
			.update({ is_public: false, shared_at: null })
			.eq("id", id)
			.select();
	};
}
