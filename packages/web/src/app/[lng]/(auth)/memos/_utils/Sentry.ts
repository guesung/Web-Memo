import * as Sentry from "@sentry/nextjs";
import type { LanguageType } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { AuthService } from "@web-memo/shared/utils";

interface InitSentryProps extends LanguageType {}

export async function initSentryUserInfo({ lng }: InitSentryProps) {
	const supabase = getSupabaseClient();
	const user = await new AuthService(supabase).getUser();

	Sentry.setUser({
		username: user?.data?.user?.identities?.[0]?.identity_data?.name,
		email: user?.data?.user?.email,
		id: user?.data?.user?.id,
		ip_address: "{{auto}}",
	});
	Sentry.setTag("lng", lng);
}
