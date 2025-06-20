import { NEED_AUTH_PAGES, PATHS } from "@extension/shared/constants";
import { AuthService } from "@extension/shared/utils";
import { CONFIG } from "@src/constants";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function updateAuthorization(request: NextRequest) {
	const nextResponse = NextResponse.next({
		request,
		headers: request.headers,
	});

	const supabaseClient = createServerClient(
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
	const isNeedAuthPage = NEED_AUTH_PAGES.includes(request.nextUrl.pathname);

	if (!isUserLogin && isNeedAuthPage) {
		const url = request.nextUrl.clone();
		url.pathname = PATHS.login;
		return NextResponse.redirect(url);
	}

	return nextResponse;
}
