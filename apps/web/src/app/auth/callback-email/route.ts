import {
	LOGIN_NEXT_COOKIE,
	sanitizeNextPath,
} from "@src/modules/supabase/nextPath";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { PATHS } from "@web-memo/shared/constants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);

	const supabase = await getSupabaseClient();
	const { data: sessionData } = await supabase.auth.getSession();

	if (!sessionData.session) throw new Error("no session");

	const cookieStore = await cookies();
	const nextPath = sanitizeNextPath(cookieStore.get(LOGIN_NEXT_COOKIE)?.value);
	cookieStore.delete(LOGIN_NEXT_COOKIE);

	if (!nextPath) {
		return NextResponse.redirect(
			`${requestUrl.origin}${PATHS.memos}?login=email`,
		);
	}

	const redirectUrl = new URL(`${requestUrl.origin}${nextPath}`);
	redirectUrl.searchParams.set("login", "email");

	return NextResponse.redirect(redirectUrl);
}
