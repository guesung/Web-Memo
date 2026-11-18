import { createServerClient } from "@supabase/ssr";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { LOGIN_NEXT_PARAM } from "./nextPath";

/**
 * 비로그인 상태로 접근하면 로그인 페이지로 돌려보낼 경로들.
 *
 * @description 아래 `includes` 비교는 부분 문자열 매칭이라 상위 경로 하나로 그 아래가 전부
 * 걸린다. `/memos`가 위시·중요·읽는 중·설정·휴지통을, `/admin`이 `/admin/users`를 덮으므로
 * 하위 경로를 따로 적지 않는다. 예전에는 쿼리 문자열이 붙은 `PATHS.memosWish`가 들어 있었는데
 * 비교 대상이 pathname이라 절대 매치되지 않는 죽은 항목이었다.
 */
const NEED_AUTH_PAGES = [
	PATHS.memos,
	PATHS.highlights,
	PATHS.favorites,
	PATHS.admin,
];

const createNextResponse = (request: NextRequest) =>
	NextResponse.next({
		request,
		headers: request.headers,
	});

export async function updateAuthorization(request: NextRequest) {
	let nextResponse = createNextResponse(request);

	const supabaseClient = createServerClient<Database, "memo">(
		SUPABASE.url,
		SUPABASE.anonKey,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(
					cookiesToSet: Array<{
						name: string;
						value: string;
						options?: Record<string, unknown>;
					}>,
				) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					// 갱신된 쿠키를 페이지 요청까지 넘기려면 응답을 다시 만들어야 한다.
					// NextResponse.next()는 만들 때의 요청 헤더만 실어 보내서, 먼저 만든 응답을 쓰면
					// Server Component가 만료된 토큰을 받고 다시 갱신하려다 쿠키 쓰기 에러를 낸다.
					nextResponse = createNextResponse(request);
					cookiesToSet.forEach(({ name, value, options }) =>
						nextResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	// 서버 검증(getUser)은 요청마다 Supabase Auth를 왕복해 TTFB를 약 200ms 늘린다. 여기서는
	// 로그인 화면으로 보낼지만 정하므로 쿠키의 세션으로 충분하고, 토큰이 만료됐을 때만
	// refresh 왕복이 생긴다. 데이터는 RLS가, admin은 layout의 getUser가 따로 검증한다.
	const {
		data: { session },
	} = await supabaseClient.auth.getSession();
	const isUserLogin = !!session;
	// API는 이 리다이렉트의 대상이 아니다. 위 `includes` 비교가 부분 문자열 매칭이라
	// `/api/admin/...` 같은 경로까지 걸리는데, 그러면 JSON을 기대한 fetch가 로그인
	// 페이지의 HTML을 받아 "Unexpected token '<'" 라는 엉뚱한 파싱 에러로 실패한다.
	// API의 인증은 각 라우트 핸들러가 직접 걸고 상태 코드로 답한다.
	const isNeedAuthPage =
		!request.nextUrl.pathname.startsWith("/api") &&
		NEED_AUTH_PAGES.some((page) => request.nextUrl.pathname.includes(page));

	if (!isUserLogin && isNeedAuthPage) {
		const url = request.nextUrl.clone();
		// 로그인 뒤 원래 화면(쿼리 포함)으로 돌아올 수 있게 경로를 next에 담고, 원래 쿼리는 비운다.
		const originalPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
		url.pathname = `/${request.nextUrl.pathname.split("/")[1]}${PATHS.login}`;
		url.search = "";
		url.searchParams.set(LOGIN_NEXT_PARAM, originalPath);
		return NextResponse.redirect(url);
	}

	return nextResponse;
}
