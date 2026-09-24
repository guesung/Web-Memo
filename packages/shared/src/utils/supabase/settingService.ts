import { SUPABASE } from "../../constants";
import type { MemoSupabaseClient, SettingTable } from "../../types";

/** 사용자 메모 설정을 조회하고 저장한다. */
export class SettingService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	getSetting = async () => {
		const result = await this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.setting)
			.select("*")
			.maybeSingle();

		if (result.error) {
			throw result.error;
		}

		return result;
	};

	upsertSetting = async (request: Omit<SettingTable["Insert"], "user_id">) => {
		const { data, error: authError } = await this.supabaseClient.auth.getUser();

		if (authError) {
			throw authError;
		}

		if (!data.user) {
			throw new Error("Setting update requires an authenticated user");
		}

		const result = await this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.setting)
			.upsert({ ...request, user_id: data.user.id }, { onConflict: "user_id" })
			.select()
			.single();

		if (result.error) {
			throw result.error;
		}

		return result;
	};
}
