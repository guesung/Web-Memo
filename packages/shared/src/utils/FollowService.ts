import { SUPABASE } from "../constants";
import type { MemoSupabaseClient, FollowUser } from "../types";

export class FollowService {
	constructor(private readonly supabaseClient: MemoSupabaseClient) {}

	followUser = async (followerId: string, followingId: string) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("user_follows")
			.insert({ follower_id: followerId, following_id: followingId })
			.select()
			.single();
	};

	unfollowUser = async (followerId: string, followingId: string) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("user_follows")
			.delete()
			.eq("follower_id", followerId)
			.eq("following_id", followingId);
	};

	isFollowing = async (followerId: string, followingId: string) => {
		const { data, error } = await this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("user_follows")
			.select("id")
			.eq("follower_id", followerId)
			.eq("following_id", followingId)
			.maybeSingle();

		if (error) {
			return { data: false, error };
		}

		return { data: !!data, error: null };
	};

	getFollowers = async ({
		userId,
		cursor,
		limit = 50,
	}: {
		userId: string;
		cursor?: string;
		limit?: number;
	}) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_followers" as never, {
				p_user_id: userId,
				p_limit: limit,
				p_cursor: cursor || null,
			} as never) as unknown as Promise<{
			data: FollowUser[] | null;
			error: Error | null;
		}>;
	};

	getFollowing = async ({
		userId,
		cursor,
		limit = 50,
	}: {
		userId: string;
		cursor?: string;
		limit?: number;
	}) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_following" as never, {
				p_user_id: userId,
				p_limit: limit,
				p_cursor: cursor || null,
			} as never) as unknown as Promise<{
			data: FollowUser[] | null;
			error: Error | null;
		}>;
	};
}
