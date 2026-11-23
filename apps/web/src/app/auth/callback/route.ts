import { DEFAULT_LANGUAGE, getLanguage } from "@src/modules/i18n";
import {
	buildExtensionReturnUrl,
	LOGIN_RETURN_COOKIE,
	LOGIN_RETURN_EXTENSION,
} from "@src/modules/supabase/extensionReturn";
import {
	LOGIN_NEXT_COOKIE,
	sanitizeNextPath,
} from "@src/modules/supabase/nextPath";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** 계정 생성 후 이 시간 안에 도착한 콜백이면 신규 가입으로 봅니다. */
const SIGN_UP_THRESHOLD_MSEC = 60_000;

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	// self-host(standalone)에서는 request.url의 호스트가 바인딩 주소(0.0.0.0:3000)라
	// 리다이렉트 목적지는 요청 URL이 아니라 서비스 주소로 만듭니다.
	const { webUrl } = CONFIG;

	// 로케일 없는 경로로 보내면 미들웨어가 /{lng}로 한 번 더 리다이렉트합니다.
	// 로그인 직후 화면이 뜨기까지 왕복이 하나 더 늘어나므로 여기서 붙여 보냅니다.
	const language = getLanguage(request) ?? DEFAULT_LANGUAGE;

	// 확장의 로그인 창에서 시작한 로그인은 결과와 무관하게 확장 주소로 끝내 창을 닫습니다.
	// 한 번 쓰면 지워, 다음 로그인이 웹에서 시작돼도 확장 주소로 가지 않게 합니다.
	const cookieStore = await cookies();
	const isExtensionReturn =
		cookieStore.get(LOGIN_RETURN_COOKIE)?.value === LOGIN_RETURN_EXTENSION;
	if (isExtensionReturn) cookieStore.delete(LOGIN_RETURN_COOKIE);

	// OAuth 제공자가 취소·실패를 error 쿼리로 돌려줍니다. 그대로 /memos로 보내면
	// 미들웨어가 다시 로그인 화면으로 튕겨 사용자는 아무 안내 없이 제자리로 옵니다.
	// 실패했다는 사실만 플래그로 넘기고 사유 원문은 싣지 않습니다.
	if (requestUrl.searchParams.has("error")) {
		if (isExtensionReturn) {
			return NextResponse.redirect(buildExtensionReturnUrl({ error: true }));
		}

		const loginUrl = new URL(`${webUrl}/${language}${PATHS.login}`);
		loginUrl.searchParams.set("error", "1");

		return NextResponse.redirect(loginUrl);
	}

	const code = requestUrl.searchParams.get("code");

	if (code) {
		const supabase = await getSupabaseClient();
		const { data: sessionData } =
			await supabase.auth.exchangeCodeForSession(code);

		if (!sessionData.session) {
			if (isExtensionReturn) {
				return NextResponse.redirect(
					buildExtensionReturnUrl({ error: true }),
					302,
				);
			}

			const loginUrl = new URL(`${webUrl}/${language}${PATHS.login}`);
			loginUrl.searchParams.set("error", "1");

			return NextResponse.redirect(loginUrl, 302);
		}

		// 로그인 성공은 여기서 끝나지만 서버라 gtag가 없습니다. 도착한 클라이언트가
		// 대신 찍을 수 있게 로그인 수단을 실어 보냅니다.
		const loginMethod = sessionData.session.user.app_metadata.provider;

		// 계정이 방금 만들어졌으면 신규 가입입니다. 재로그인과 구분해야 설치→가입
		// 퍼널의 전환율을 잴 수 있습니다.
		const createdAt = new Date(sessionData.session.user.created_at).getTime();
		const isSignUp = Date.now() - createdAt < SIGN_UP_THRESHOLD_MSEC;

		// 로그인 시작 때 맡겨 둔 원래 경로가 있으면 거기로(id·UTM 쿼리 포함), 없으면 기본 이동.
		const nextPath = sanitizeNextPath(
			cookieStore.get(LOGIN_NEXT_COOKIE)?.value,
		);
		cookieStore.delete(LOGIN_NEXT_COOKIE);

		if (isExtensionReturn) {
			return NextResponse.redirect(
				buildExtensionReturnUrl({
					login: loginMethod ?? "unknown",
					isSignUp,
				}),
			);
		}

		const redirectUrl = new URL(
			nextPath ? `${webUrl}${nextPath}` : `${webUrl}/${language}${PATHS.memos}`,
		);
		redirectUrl.searchParams.set("login", loginMethod ?? "unknown");
		if (isSignUp) redirectUrl.searchParams.set("signup", "true");

		return NextResponse.redirect(redirectUrl);
	}

	return NextResponse.redirect(`${webUrl}/${language}${PATHS.memos}`);
}
