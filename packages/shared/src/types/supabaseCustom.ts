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
}

export interface ProfileWithStats {
	user_id: string;
	nickname: string | null;
	avatar_url: string | null;
	bio: string | null;
	website: string | null;
	created_at: string | null;
	public_memo_count: number;
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
