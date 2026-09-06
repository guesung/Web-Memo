import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");

	if (code) {
		const supabase = getSupabaseClient();
		const { data: sessionData } =
			await supabase.auth.exchangeCodeForSession(code);

		if (!sessionData.session) throw new Error("no session");

		const cookieStore = cookies();
		cookieStore.set(
			SUPABASE.authCookie.accessToken,
			sessionData.session.access_token,
			{
				maxAge: 3600 * 24 * 365, // 1년
			},
		);
		cookieStore.set(
			SUPABASE.authCookie.refreshToken,
			sessionData.session.refresh_token,
			{
				maxAge: 3600 * 24 * 365, // 1년
			},
		);

		// 로그인 성공은 여기서 끝나지만 서버라 gtag가 없습니다. 도착한 클라이언트가
		// 대신 찍을 수 있게 로그인 수단을 실어 보냅니다.
		const loginMethod = sessionData.session.user.app_metadata.provider;

		return NextResponse.redirect(
			`${requestUrl.origin}${PATHS.memos}?login=${encodeURIComponent(loginMethod ?? "unknown")}`,
		);
	}

	return NextResponse.redirect(requestUrl.origin + PATHS.memos);
}
