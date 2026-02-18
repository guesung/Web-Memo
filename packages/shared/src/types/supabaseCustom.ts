import type {
	PostgrestSingleResponse,
	QueryData,
	SupabaseClient,
} from "@supabase/supabase-js";
import type { MemoService } from "../utils";

import type { Database } from "./supabase";

// memo schema

export type MemoSupabaseClient = SupabaseClient<Database, "memo">;

export type MemoTable = Database["memo"]["Tables"]["memo"];
export type MemoRow = MemoTable["Row"];
export type MemoSupabaseResponse = PostgrestSingleResponse<
	Array<MemoTable["Row"]>
>;

export type CategoryTable = Database["memo"]["Tables"]["category"];
export type CategoryRow = CategoryTable["Row"];
export type CategorySupabaseResponse = PostgrestSingleResponse<
	Array<CategoryTable["Row"]>
>;

export type GetMemoResponse = QueryData<
	ReturnType<MemoService["getMemos"]>
>[number];

export type FeedbackSupabaseClient = SupabaseClient<Database, "feedback">;

// feedback schema

export type FeedbackTable = Database["feedback"]["Tables"]["feedbacks"];
export type FeedbackRow = FeedbackTable["Row"];
export type FeedbackInsert = FeedbackTable["Insert"];
export type FeedbackUpdate = FeedbackTable["Update"];

export interface FeedbackSupabaseResponse {
	data: FeedbackRow[] | null;
	error: Error | null;
}
