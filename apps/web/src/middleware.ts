import { PATHS } from "@web-memo/shared/constants";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getLanguage, SUPPORTED_LANGUAGES } from "./modules/i18n";
import { updateAuthorization } from "./modules/supabase";

export async function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	// 루트 페이지 - SEO를 위해 소개 페이지로 리다이렉트
	const isRootPath = pathname === PATHS.root;
	if (isRootPath) {
		const language = getLanguage(request);
		return NextResponse.redirect(
			new URL(`/${language}${PATHS.introduce}`, request.url),
		);
	}

	// lng가 없는 경우 && auth 페이지가 아닌 경우
	const isLanguagePath = SUPPORTED_LANGUAGES.some((lng) =>
		pathname.startsWith(`/${lng}`),
	);
	const isAuthPath = pathname.startsWith(PATHS.auth);
	const isApiPath = pathname.startsWith("/api");
	const isSitemapPath = pathname.startsWith("/sitemap");
	const isRobotsPath = pathname.startsWith("/robots");

	const language = getLanguage(request);

	if (
		!isLanguagePath &&
		!isAuthPath &&
		!isApiPath &&
		!isSitemapPath &&
		!isRobotsPath
	)
		return NextResponse.redirect(
			new URL(
				`/${language}${pathname}${request.nextUrl.search}${request.nextUrl.hash}`,
				request.url,
			),
		);

	// 토큰 업데이트
	return await updateAuthorization(request);
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
