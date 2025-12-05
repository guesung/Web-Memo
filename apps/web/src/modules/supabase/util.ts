import { createServerClient } from "@supabase/ssr";
import { CONFIG } from "@web-memo/env";
import { NEED_AUTH_PAGES, PATHS } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";
import { AuthService } from "@web-memo/shared/utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function updateAuthorization(request: NextRequest) {
	const nextResponse = NextResponse.next({
		request,
		headers: request.headers,
	});

	const supabaseClient = createServerClient<Database, "memo", Database["memo"]>(
		CONFIG.supabaseUrl,
		CONFIG.supabaseAnonKey,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
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

	const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();
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
