import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";

/**
 * 과거 메모 판정의 후보가 되는 메모 한 건.
 * @description 메모 본문(memo·impression·actionItem)은 읽지 않는다. 제목·URL만으로 판정한다.
 */
export interface IFRecentMemo {
	id: number;
	title: string;
	url: string;
	favIconUrl: string | null;
	updated_at: string | null;
}

/**
 * 사용자의 최근 메모를 최대 200개까지 읽는다.
 * @description 서비스 롤 키를 쓰지 않고 사용자 토큰을 실은 클라이언트로 조회해 RLS를 그대로 탄다.
 * 조회에 실패하면 Supabase 오류를 그대로 던진다.
 */
export const getRecentMemos = async ({
	accessToken,
	userId,
}: {
	accessToken: string;
	userId: string;
}): Promise<IFRecentMemo[]> => {
	const supabaseClient = createClient<Database, "memo">(
		SUPABASE.url,
		SUPABASE.anonKey,
		{
			global: { headers: { Authorization: `Bearer ${accessToken}` } },
			db: { schema: SUPABASE.schema.memo },
			auth: { persistSession: false, autoRefreshToken: false },
		},
	);

	const { data, error } = await supabaseClient
		.from(SUPABASE.table.memo)
		.select("id,title,url,favIconUrl,updated_at")
		.eq("user_id", userId)
		.is("deleted_at", null)
		// Postgres의 DESC는 NULL을 앞에 두므로, 수정 시각이 없는 메모가 최근 메모를 밀어내지 않게 뒤로 보낸다.
		.order("updated_at", { ascending: false, nullsFirst: false })
		.limit(200);

	if (error) {
		throw error;
	}

	return data;
};
