import { PATHS } from "@extension/shared/constants";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getLanguage, SUPPORTED_LANGUAGES } from "./modules/i18n";
import { updateAuthorization } from "./modules/supabase";

export async function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	// 루트 페이지
	const isRootPath = pathname === PATHS.root;
	if (isRootPath)
		return NextResponse.redirect(new URL(`${PATHS.memos}`, request.url));

	// lng가 없는 경우 && auth 페이지가 아닌 경우
	const isLanguagePath = SUPPORTED_LANGUAGES.some((lng) =>
		pathname.startsWith(`/${lng}`),
	);
	const isAuthPath = pathname.startsWith(PATHS.auth);

	const language = getLanguage(request);

	if (!isLanguagePath && !isAuthPath)
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
