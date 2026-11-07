import { createServerClient } from "@supabase/ssr";
import type { Provider } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import type { Database, MemoSupabaseClient } from "@web-memo/shared/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
	LOGIN_NEXT_COOKIE,
	LOGIN_NEXT_MAX_AGE_SEC,
	LOGIN_NEXT_PARAM,
	sanitizeNextPath,
} from "./nextPath";

export const getSupabaseClient = async () => {
	const cookieStore = await cookies();

	return createServerClient<Database, "memo">(SUPABASE.url, SUPABASE.anonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(
				cookiesToSet: Array<{
					name: string;
					value: string;
					options?: Record<string, unknown>;
				}>,
			) {
				cookiesToSet.forEach(({ name, value, options }) =>
					cookieStore.set(name, value, options),
				);
			},
		},
		db: { schema: SUPABASE.table.memo },
	}) as unknown as MemoSupabaseClient;
};

/**
 * 로그인 폼이 실어 보낸 next를 검증해 콜백이 읽을 쿠키에 맡깁니다.
 * @description OAuth는 제공자를 거쳐 돌아오므로 쿼리에 실으면 리다이렉트 허용 목록을 건드려야 합니다.
 * 허용되지 않는 값이면 이전 시도가 남긴 쿠키까지 지워 기본 이동으로 돌아갑니다.
 */
const rememberNextPath = async (formData?: FormData) => {
	const cookieStore = await cookies();
	const nextPath = sanitizeNextPath(formData?.get(LOGIN_NEXT_PARAM));

	if (!nextPath) {
		cookieStore.delete(LOGIN_NEXT_COOKIE);
		return;
	}

	cookieStore.set(LOGIN_NEXT_COOKIE, nextPath, {
		maxAge: LOGIN_NEXT_MAX_AGE_SEC,
		httpOnly: true,
		sameSite: "lax",
		path: "/",
	});
};

export const signInWithOAuth = async (
	provider: Provider,
	formData?: FormData,
) => {
	"use server";
	await rememberNextPath(formData);
	const supabaseClient = await getSupabaseClient();

	const { error, data } = await supabaseClient.auth.signInWithOAuth({
		provider,
		options: {
			redirectTo: `${CONFIG.webUrl}${PATHS.callbackOAuth}`,
		},
	});

	if (error) redirect("/error");
	revalidatePath(PATHS.root, "layout");
	redirect(data.url);
};

export const signInWithEmail = async (
	email: string,
	password: string,
	formData?: FormData,
) => {
	"use server";
	await rememberNextPath(formData);
	const supabaseClient = await getSupabaseClient();
	const { error } = await supabaseClient.auth.signInWithPassword({
		email,
		password,
	});

	if (error) redirect(PATHS.error);
	revalidatePath(PATHS.root, "layout");
	redirect(`${CONFIG.webUrl}${PATHS.callbackEmail}`);
};
