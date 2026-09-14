import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "@web-memo/shared/constants";
import type { NextRequest } from "next/server";

/** API 요청의 Supabase Bearer 토큰을 검증하고 사용자 ID를 반환합니다. */
export const authenticateBillingRequest = async (
	request: NextRequest,
): Promise<string | null> => {
	const authorizationHeader = request.headers.get("authorization");
	const accessToken = authorizationHeader?.startsWith("Bearer ")
		? authorizationHeader.slice(7)
		: null;

	if (!accessToken) {
		return null;
	}

	const supabaseClient = createClient(SUPABASE.url, SUPABASE.anonKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
	const { data, error } = await supabaseClient.auth.getUser(accessToken);

	if (error || !data.user) {
		return null;
	}

	return data.user.id;
};
