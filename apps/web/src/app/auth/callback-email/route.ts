import {
	LOGIN_NEXT_COOKIE,
	sanitizeNextPath,
} from "@src/modules/supabase/nextPath";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { CONFIG } from "@web-memo/env";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { isProduction } from "@web-memo/shared/utils";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** self-host에서는 request.url의 호스트가 바인딩 주소라 서비스 주소로 리다이렉트합니다. */
export async function GET() {
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

	const nextPath = sanitizeNextPath(cookieStore.get(LOGIN_NEXT_COOKIE)?.value);
	cookieStore.delete(LOGIN_NEXT_COOKIE);

	if (!nextPath) {
		return NextResponse.redirect(`${CONFIG.webUrl}${PATHS.memos}?login=email`);
	}

	const redirectUrl = new URL(`${CONFIG.webUrl}${nextPath}`);
	redirectUrl.searchParams.set("login", "email");

	return NextResponse.redirect(redirectUrl);
}
