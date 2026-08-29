import { PATHS } from "@web-memo/shared/constants";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getLanguage, SUPPORTED_LANGUAGES } from "./modules/i18n";
import { updateAuthorization } from "./modules/supabase";

/**
 * 인증 갱신을 건너뛰어야 하는 경로.
 *
 * updateAuthorization은 매 요청마다 Supabase에 왕복하는데, Slack은 3초 안에 응답을
 * 못 받으면 사용자에게 실패로 표시합니다. 두 경로 모두 세션을 쓰지 않으므로 그냥 통과시킵니다.
 */
const AUTH_BYPASS_PATHS = ["/api/slack", "/api/version"];

export async function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	if (AUTH_BYPASS_PATHS.some((path) => pathname.startsWith(path))) {
		return NextResponse.next();
	}

	const language = getLanguage(request);

	const isRootPath = pathname === PATHS.root;
	if (isRootPath)
		return NextResponse.redirect(
			new URL(`/${language}${PATHS.introduce}`, request.url),
		);

	const isLanguagePath = SUPPORTED_LANGUAGES.some((lng) =>
		pathname.startsWith(`/${lng}`),
	);
	const isAuthPath = pathname.startsWith(PATHS.auth);
	const isApiPath = pathname.startsWith("/api");
	const isSitemapPath = pathname.startsWith("/sitemap");
	const isRobotsPath = pathname.startsWith("/robots");
	const isNotNeedLanguagePath =
		isAuthPath || isApiPath || isSitemapPath || isRobotsPath;

	if (!isLanguagePath && !isNotNeedLanguagePath)
		return NextResponse.redirect(
			new URL(
				`/${language}${pathname}${request.nextUrl.search}${request.nextUrl.hash}`,
				request.url,
			),
		);

	return await updateAuthorization(request);
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
