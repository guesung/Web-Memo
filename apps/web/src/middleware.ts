import { PATHS } from "@web-memo/shared/constants";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isEdgeCachePath } from "./modules/edgeCache";
import { getLanguage, SUPPORTED_LANGUAGES } from "./modules/i18n";
import { updateAuthorization } from "./modules/supabase";

// Slack은 3초 안에 응답이 없으면 실패로 처리하므로 Supabase 왕복을 건너뛴다.
// /api/health는 컨테이너 프록시가 1초마다 부르는 헬스체크라 인증이 필요 없다.
const AUTH_BYPASS_PATHS = [
	"/api/slack",
	"/api/version",
	"/api/health",
	"/api/install-guide-load",
];

const PUBLIC_SEO_PATHS = ["/sitemap.xml", "/robots.txt"];

// robots.txt Disallow는 크롤러가 noindex를 못 읽어 색인이 남는다. 라우트가 "use server"라
// metadata export도 못 해 X-Robots-Tag 헤더로 막는다.
const NOINDEX_PATHS = [
	PATHS.login,
	PATHS.memos,
	PATHS.highlights,
	PATHS.favorites,
	PATHS.admin,
	PATHS.uninstall,
	PATHS.unsubscribe,
];

// 이미 색인된 URL의 유입을 404로 끊지 않으려고 영구 이동시킨다.
const LEGACY_REDIRECTS: Record<string, string> = {
	"/update": PATHS.introduce,
};

function removeLanguagePrefix(pathname: string) {
	return SUPPORTED_LANGUAGES.reduce(
		(path, lng) =>
			path.startsWith(`/${lng}/`) ? path.slice(lng.length + 1) : path,
		pathname,
	);
}

function isNoindexPath(pathname: string) {
	const pathWithoutLanguage = removeLanguagePrefix(pathname);

	return NOINDEX_PATHS.some(
		(path) =>
			pathWithoutLanguage === path ||
			pathWithoutLanguage.startsWith(`${path}/`),
	);
}

// 배열 순서가 우선순위다. 예전 /memos가 isStar·isReading을 isWish보다 우선했다.
const LEGACY_MEMO_FILTER_QUERIES = [
	{ query: "isStar", path: PATHS.memosStar },
	{ query: "isReading", path: PATHS.memosReading },
	{ query: "isWish", path: PATHS.memosWish },
];

// 307을 쓴다. 확장은 당일 롤백이 안 돼 308이 캐시되면 되돌릴 수 없다.
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

	// global-not-found.tsx는 params를 못 받아 <html lang>용 경로를 헤더로 넘긴다.
	request.headers.set("x-pathname", pathname);

	if (
		pathname === "/api/uninstall" ||
		AUTH_BYPASS_PATHS.some((path) => pathname.startsWith(path))
	) {
		return NextResponse.next();
	}
	if (PUBLIC_SEO_PATHS.includes(pathname)) {
		return NextResponse.next();
	}
	// Cloudflare 엣지가 HTML을 캐시하는 페이지. 세션 갱신이 Set-Cookie를 붙이면 캐시되지 않고
	// 다른 사람의 쿠키가 캐시에 섞일 수 있어 건너뛴다. 로그인 상태는 클라이언트가 판단한다.
	if (isEdgeCachePath(pathname)) {
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
	const isNotNeedLanguagePath = isAuthPath || isApiPath;

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

	const pathWithoutLanguage = removeLanguagePrefix(pathname);
	const legacyDestination = LEGACY_REDIRECTS[pathWithoutLanguage];
	if (legacyDestination) {
		const languagePrefix = pathname.slice(
			0,
			pathname.length - pathWithoutLanguage.length,
		);

		return NextResponse.redirect(
			new URL(`${languagePrefix}${legacyDestination}`, request.url),
			308,
		);
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
