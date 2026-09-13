import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "@web-memo/shared/constants";

/** 서비스 역할로 billing 스키마에 접근하는 서버 전용 클라이언트를 만듭니다. */
export const createBillingAdminClient = () => {
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!serviceRoleKey) {
		throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
	}

	return createClient(SUPABASE.url, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
};
