import { SUPABASE } from "../constants";
import type {
	MemoSupabaseClient,
	ProfilesUpdate,
	ProfileWithStats,
} from "../types";

export class ProfileService {
	constructor(private readonly supabaseClient: MemoSupabaseClient) {}

	getProfile = async (userId: string) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("profiles")
			.select("*")
			.eq("user_id", userId)
			.single();
	};

	getProfileWithStats = async (userId: string, currentUserId?: string) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.rpc("get_profile_with_stats" as never, {
				p_user_id: userId,
				p_current_user_id: currentUserId || null,
			} as never) as unknown as Promise<{ data: ProfileWithStats[] | null; error: Error | null }>;
	};

	updateProfile = async (userId: string, data: ProfilesUpdate) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("profiles")
			.update(data)
			.eq("user_id", userId)
			.select()
			.single();
	};

	upsertProfile = async (userId: string, data: ProfilesUpdate) => {
		return this.supabaseClient
			.schema(SUPABASE.schema.memo)
			.from("profiles")
			.upsert({ user_id: userId, ...data })
			.select()
			.single();
	};
}
