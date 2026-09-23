import { SUPABASE } from "../../constants";
import type { MemoSupabaseClient, SettingTable } from "../../types";

/** 사용자 메모 설정을 조회하고 저장한다. */
export class SettingService {
	supabaseClient: MemoSupabaseClient;

	constructor(supabaseClient: MemoSupabaseClient) {
		this.supabaseClient = supabaseClient;
	}

	getSetting = async () =>
		this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.setting)
			.select("*")
			.maybeSingle();

	upsertSetting = async (request: Omit<SettingTable["Insert"], "user_id">) => {
		const {
			data: { user },
		} = await this.supabaseClient.auth.getUser();

		return this.supabaseClient
			.schema(SUPABASE.table.memo)
			.from(SUPABASE.table.setting)
			.upsert({ ...request, user_id: user?.id }, { onConflict: "user_id" })
			.select()
			.single();
	};
}
