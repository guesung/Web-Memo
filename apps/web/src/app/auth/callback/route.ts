import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** 계정 생성 후 이 시간 안에 도착한 콜백이면 신규 가입으로 봅니다. */
const SIGN_UP_THRESHOLD_MSEC = 60_000;

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

		// 계정이 방금 만들어졌으면 신규 가입입니다. 재로그인과 구분해야 설치→가입
		// 퍼널의 전환율을 잴 수 있습니다.
		const createdAt = new Date(sessionData.session.user.created_at).getTime();
		const isSignUp = Date.now() - createdAt < SIGN_UP_THRESHOLD_MSEC;

		const redirectUrl = new URL(requestUrl.origin + PATHS.memos);
		redirectUrl.searchParams.set("login", loginMethod ?? "unknown");
		if (isSignUp) redirectUrl.searchParams.set("signup", "true");

		return NextResponse.redirect(redirectUrl);
	}

	return NextResponse.redirect(requestUrl.origin + PATHS.memos);
}
