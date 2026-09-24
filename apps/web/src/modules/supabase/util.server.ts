import { createServerClient } from "@supabase/ssr";
import type { Provider } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import type { Database, MemoSupabaseClient } from "@web-memo/shared/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSafeSettingsNext } from "./getSafeSettingsNext";

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

/** OAuth 인증을 시작하고 유효한 설정 복귀 경로를 콜백에 전달합니다. */
export const signInWithOAuth = async (
	provider: Provider,
	next?: string | null,
) => {
	"use server";
	const supabaseClient = await getSupabaseClient();
	const callbackUrl = new URL(PATHS.callbackOAuth, CONFIG.webUrl);
	const safeNext = getSafeSettingsNext(next);
	if (safeNext) {
		callbackUrl.searchParams.set("next", safeNext);
	}

	const { error, data } = await supabaseClient.auth.signInWithOAuth({
		provider,
		options: {
			redirectTo: callbackUrl.toString(),
		},
	});

	if (error) redirect("/error");
	revalidatePath(PATHS.root, "layout");
	redirect(data.url);
};

/** 이메일 인증을 완료하고 유효한 설정 복귀 경로를 콜백에 전달합니다. */
export const signInWithEmail = async (
	email: string,
	password: string,
	next?: string | null,
) => {
	"use server";
	const supabaseClient = await getSupabaseClient();
	const { error } = await supabaseClient.auth.signInWithPassword({
		email,
		password,
	});

	if (error) redirect(PATHS.error);
	revalidatePath(PATHS.root, "layout");
	const callbackUrl = new URL(PATHS.callbackEmail, CONFIG.webUrl);
	const safeNext = getSafeSettingsNext(next);
	if (safeNext) {
		callbackUrl.searchParams.set("next", safeNext);
	}
	redirect(callbackUrl.toString());
};
