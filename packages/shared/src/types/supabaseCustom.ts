import type {
	PostgrestSingleResponse,
	QueryData,
	SupabaseClient,
} from "@supabase/supabase-js";
import type { MemoService } from "../utils";

import type { Database } from "./supabase";

// memo schema

export type MemoSupabaseClient = SupabaseClient<
	Database,
	"memo",
	Database["memo"]
>;

export type MemoTable = Database["memo"]["Tables"]["memo"];
export type MemoRow = MemoTable["Row"];
export type MemoSupabaseResponse = PostgrestSingleResponse<
	Array<MemoTable["Row"]>
>;

// profiles
export type ProfilesTable = Database["memo"]["Tables"]["profiles"];
export type ProfilesRow = ProfilesTable["Row"];
export type ProfilesInsert = ProfilesTable["Insert"];
export type ProfilesUpdate = ProfilesTable["Update"];

// Community types
export interface PublicMemo {
	id: number;
	title: string;
	memo: string;
	url: string;
	fav_icon_url: string | null;
	user_id: string;
	is_public: boolean;
	shared_at: string | null;
	created_at: string | null;
	author_nickname: string | null;
	author_avatar_url: string | null;
	like_count: number;
	bookmark_count: number;
	comment_count: number;
	is_liked: boolean;
	is_bookmarked: boolean;
}

export interface ProfileWithStats {
	user_id: string;
	nickname: string | null;
	avatar_url: string | null;
	bio: string | null;
	website: string | null;
	created_at: string | null;
	public_memo_count: number;
	follower_count: number;
	following_count: number;
	is_following: boolean;
}

export type CategoryTable = Database["memo"]["Tables"]["category"];
export type CategoryRow = CategoryTable["Row"];
export type CategorySupabaseResponse = PostgrestSingleResponse<
	Array<CategoryTable["Row"]>
>;

export type GetMemoResponse = QueryData<
	ReturnType<MemoService["getMemos"]>
>[number];

export type FeedbackSupabaseClient = SupabaseClient<
	Database,
	"feedback",
	Database["feedback"]
>;

// feedback schema

export type FeedbackTable = Database["feedback"]["Tables"]["feedbacks"];
export type FeedbackRow = FeedbackTable["Row"];
export type FeedbackInsert = FeedbackTable["Insert"];
export type FeedbackUpdate = FeedbackTable["Update"];

export interface FeedbackSupabaseResponse {
	data: FeedbackRow[] | null;
	error: Error | null;
}

// Phase 2 types
export type MemoLikesTable = Database["memo"]["Tables"]["memo_likes"];
export type MemoLikesRow = MemoLikesTable["Row"];
export type MemoLikesInsert = MemoLikesTable["Insert"];

export type MemoBookmarksTable = Database["memo"]["Tables"]["memo_bookmarks"];
export type MemoBookmarksRow = MemoBookmarksTable["Row"];
export type MemoBookmarksInsert = MemoBookmarksTable["Insert"];

export type MemoCommentsTable = Database["memo"]["Tables"]["memo_comments"];
export type MemoCommentsRow = MemoCommentsTable["Row"];
export type MemoCommentsInsert = MemoCommentsTable["Insert"];
export type MemoCommentsUpdate = MemoCommentsTable["Update"];

export type UserFollowsTable = Database["memo"]["Tables"]["user_follows"];
export type UserFollowsRow = UserFollowsTable["Row"];
export type UserFollowsInsert = UserFollowsTable["Insert"];

export interface MemoComment {
	id: number;
	memo_id: number;
	user_id: string;
	content: string;
	created_at: string;
	updated_at: string;
	author_nickname: string | null;
	author_avatar_url: string | null;
}

export interface BookmarkedMemo extends PublicMemo {
	bookmarked_at: string;
}

export interface FollowUser {
	user_id: string;
	nickname: string | null;
	avatar_url: string | null;
	bio: string | null;
	followed_at: string;
}
