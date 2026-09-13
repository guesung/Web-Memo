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

/**
 * 쿼리 파라미터로 필터를 걸던 구 URL과, 그것이 옮겨간 라우트.
 *
 * @description 앞에 있는 것이 먼저 이긴다. 예전 `/memos`는 `isStar`·`isReading`이 켜지면
 * `isWish`를 무시했는데, 그 암묵적 우선순위를 그대로 옮긴 순서다.
 */
const LEGACY_MEMO_FILTER_QUERIES = [
	{ query: "isStar", path: PATHS.memosStar },
	{ query: "isReading", path: PATHS.memosReading },
	{ query: "isWish", path: PATHS.memosWish },
];

/**
 * `/memos?isWish=true` 같은 구 URL을 새 라우트로 돌려보낸다. 해당이 없으면 null.
 *
 * @description 308(영구)이 아니라 307(임시)이다. 크롬 확장이 사이드 패널에서 웹 URL을
 * 런타임에 조립하는데, 확장은 웹스토어 심사를 거쳐 당일 롤아웃이 불가능하다. 브라우저에
 * 영구 리다이렉트가 캐시되면 되돌릴 방법이 없다.
 */
function getLegacyMemoFilterRedirect(request: NextRequest) {
	const { pathname, searchParams } = request.nextUrl;

	if (!pathname.endsWith(PATHS.memos)) {
		return null;
	}

	const matched = LEGACY_MEMO_FILTER_QUERIES.find(
		({ query }) => searchParams.get(query) === "true",
	);
	if (!matched) {
		return null;
	}

	const url = request.nextUrl.clone();
	url.pathname = `${pathname}${matched.path.slice(PATHS.memos.length)}`;
	for (const { query } of LEGACY_MEMO_FILTER_QUERIES) {
		url.searchParams.delete(query);
	}

	return NextResponse.redirect(url, 307);
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

	const legacyMemoFilterRedirect = getLegacyMemoFilterRedirect(request);
	if (legacyMemoFilterRedirect) {
		return legacyMemoFilterRedirect;
	}

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
