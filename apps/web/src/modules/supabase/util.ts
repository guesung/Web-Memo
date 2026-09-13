import { createServerClient } from "@supabase/ssr";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import type { Database, MemoSupabaseClient } from "@web-memo/shared/types";
import { AuthService } from "@web-memo/shared/utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * 비로그인 상태로 접근하면 로그인 페이지로 돌려보낼 경로들.
 *
 * @description 아래 `includes` 비교는 부분 문자열 매칭이라 상위 경로 하나로 그 아래가 전부
 * 걸린다. `/memos`가 위시·중요·읽는 중·설정·휴지통을, `/admin`이 `/admin/users`를 덮으므로
 * 하위 경로를 따로 적지 않는다. 예전에는 쿼리 문자열이 붙은 `PATHS.memosWish`가 들어 있었는데
 * 비교 대상이 pathname이라 절대 매치되지 않는 죽은 항목이었다.
 */
const NEED_AUTH_PAGES = [PATHS.memos, PATHS.highlights, PATHS.admin];

export async function updateAuthorization(request: NextRequest) {
	const nextResponse = NextResponse.next({
		request,
		headers: request.headers,
	});

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
					cookiesToSet.forEach(({ name, value, options }) =>
						nextResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	const isUserLogin = await new AuthService(
		supabaseClient as unknown as MemoSupabaseClient,
	).checkUserLogin();
	const isNeedAuthPage = NEED_AUTH_PAGES.some((page) =>
		request.nextUrl.pathname.includes(page),
	);

	if (!isUserLogin && isNeedAuthPage) {
		const url = request.nextUrl.clone();
		url.pathname = PATHS.login;
		return NextResponse.redirect(url);
	}

	return nextResponse;
}
