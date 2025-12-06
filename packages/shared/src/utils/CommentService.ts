import { SUPABASE } from "../constants";
import type { MemoSupabaseClient, MemoComment } from "../types";

export class CommentService {
	constructor(private readonly supabaseClient: MemoSupabaseClient) {}

	getComments = async ({
		memoId,
		cursor,
		limit = 50,
	}: {
		memoId: number;
		cursor?: string;
		limit?: number;
	}) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_memo_comments" as never, {
				p_memo_id: memoId,
				p_limit: limit,
				p_cursor: cursor || null,
			} as never) as unknown as Promise<{
			data: MemoComment[] | null;
			error: Error | null;
		}>;
	};

	createComment = async ({
		memoId,
		userId,
		content,
	}: {
		memoId: number;
		userId: string;
		content: string;
	}) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_comments")
			.insert({ memo_id: memoId, user_id: userId, content })
			.select()
			.single();
	};

	updateComment = async ({
		commentId,
		content,
	}: {
		commentId: number;
		content: string;
	}) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_comments")
			.update({ content })
			.eq("id", commentId)
			.select()
			.single();
	};

	deleteComment = async (commentId: number) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("memo_comments")
			.delete()
			.eq("id", commentId);
	};
}
