import { createServerClient } from "@supabase/ssr";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import type { Database, MemoSupabaseClient } from "@web-memo/shared/types";
import { AuthService } from "@web-memo/shared/utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** 비로그인 상태로 접근하면 로그인 페이지로 돌려보낼 경로들. */
const NEED_AUTH_PAGES = [
	PATHS.memos,
	PATHS.memosWish,
	PATHS.memosSetting,
	PATHS.highlights,
	PATHS.admin,
	PATHS.adminUsers,
];

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
