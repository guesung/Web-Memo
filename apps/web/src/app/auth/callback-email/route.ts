import { getSafeSettingsNext } from "@src/modules/supabase/getSafeSettingsNext";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { isProduction } from "@web-memo/shared/utils";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);

	const supabase = await getSupabaseClient();
	const { data: sessionData } = await supabase.auth.getSession();

	if (!sessionData.session) throw new Error("no session");

	const cookieStore = await cookies();
	cookieStore.set(
		SUPABASE.authCookie.accessToken,
		sessionData.session.access_token,
		{
			maxAge: 3600 * 24 * 365, // 1년
			httpOnly: true,
			secure: isProduction(),
			sameSite: "lax",
			path: "/",
		},
	);
	cookieStore.set(
		SUPABASE.authCookie.refreshToken,
		sessionData.session.refresh_token,
		{
			maxAge: 3600 * 24 * 365, // 1년
			httpOnly: true,
			secure: isProduction(),
			sameSite: "lax",
			path: "/",
		},
	);

	const next = getSafeSettingsNext(requestUrl.searchParams.get("next"));
	const redirectUrl = new URL(next ?? PATHS.memos, requestUrl.origin);
	redirectUrl.searchParams.set("login", "email");

	return NextResponse.redirect(redirectUrl);
}
