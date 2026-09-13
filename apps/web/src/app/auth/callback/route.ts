import { DEFAULT_LANGUAGE, getLanguage } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** 계정 생성 후 이 시간 안에 도착한 콜백이면 신규 가입으로 봅니다. */
const SIGN_UP_THRESHOLD_MSEC = 60_000;

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);

	// 로케일 없는 경로로 보내면 미들웨어가 /{lng}로 한 번 더 리다이렉트합니다.
	// 로그인 직후 화면이 뜨기까지 왕복이 하나 더 늘어나므로 여기서 붙여 보냅니다.
	const language = getLanguage(request) ?? DEFAULT_LANGUAGE;

	// OAuth 제공자가 취소·실패를 error 쿼리로 돌려줍니다. 그대로 /memos로 보내면
	// 미들웨어가 다시 로그인 화면으로 튕겨 사용자는 아무 안내 없이 제자리로 옵니다.
	// 실패했다는 사실만 플래그로 넘기고 사유 원문은 싣지 않습니다.
	if (requestUrl.searchParams.has("error")) {
		const loginUrl = new URL(`${requestUrl.origin}/${language}${PATHS.login}`);
		loginUrl.searchParams.set("error", "1");

		return NextResponse.redirect(loginUrl);
	}

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

		const redirectUrl = new URL(
			`${requestUrl.origin}/${language}${PATHS.memos}`,
		);
		redirectUrl.searchParams.set("login", loginMethod ?? "unknown");
		if (isSignUp) redirectUrl.searchParams.set("signup", "true");

		return NextResponse.redirect(redirectUrl);
	}

	return NextResponse.redirect(
		`${requestUrl.origin}/${language}${PATHS.memos}`,
	);
}
