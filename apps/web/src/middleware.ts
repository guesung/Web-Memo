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

/**
 * 색인 대상이 아닌 경로. 로케일 접두사를 뗀 형태로 비교합니다.
 *
 * 로그인·인증 뒤 화면·삭제 피드백은 검색 유입 가치가 없습니다. 예전에는 robots.txt로
 * Disallow 했는데, 크롤을 막으면 크롤러가 페이지의 noindex를 읽지 못해 외부 링크만으로
 * URL이 색인에 남습니다. 그래서 크롤은 열어두고 X-Robots-Tag 헤더로 색인만 막습니다.
 *
 * 메타데이터가 아니라 헤더로 내리는 이유는, 해당 라우트 파일들이 `"use server"`라
 * 함수가 아닌 값을 export할 수 없어 `export const metadata`를 쓸 수 없기 때문입니다.
 */
const NOINDEX_PATHS = [
	PATHS.login,
	PATHS.memos,
	PATHS.highlights,
	PATHS.admin,
	PATHS.uninstall,
];

function isNoindexPath(pathname: string) {
	const pathWithoutLanguage = SUPPORTED_LANGUAGES.reduce(
		(path, lng) =>
			path.startsWith(`/${lng}/`) ? path.slice(lng.length + 1) : path,
		pathname,
	);

	return NOINDEX_PATHS.some(
		(path) =>
			pathWithoutLanguage === path ||
			pathWithoutLanguage.startsWith(`${path}/`),
	);
}

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

	const response = await updateAuthorization(request);

	if (isNoindexPath(pathname))
		response.headers.set("X-Robots-Tag", "noindex, nofollow");

	return response;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
