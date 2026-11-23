import {
	LOGIN_NEXT_COOKIE,
	sanitizeNextPath,
} from "@src/modules/supabase/nextPath";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** self-host에서는 request.url의 호스트가 바인딩 주소라 서비스 주소로 리다이렉트합니다. */
export async function GET() {
	const supabase = await getSupabaseClient();
	const { data: sessionData } = await supabase.auth.getSession();

	if (!sessionData.session) throw new Error("no session");

	const cookieStore = await cookies();
	const nextPath = sanitizeNextPath(cookieStore.get(LOGIN_NEXT_COOKIE)?.value);
	cookieStore.delete(LOGIN_NEXT_COOKIE);

	if (!nextPath) {
		return NextResponse.redirect(`${CONFIG.webUrl}${PATHS.memos}?login=email`);
	}

	const redirectUrl = new URL(`${CONFIG.webUrl}${nextPath}`);
	redirectUrl.searchParams.set("login", "email");

	return NextResponse.redirect(redirectUrl);
}
