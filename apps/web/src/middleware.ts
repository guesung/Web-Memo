import { PATHS } from "@web-memo/shared/constants";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getLanguage, SUPPORTED_LANGUAGES } from "./modules/i18n";
import { updateAuthorization } from "./modules/supabase";

export async function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
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
