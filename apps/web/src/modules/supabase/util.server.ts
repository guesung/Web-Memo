import { createServerClient } from "@supabase/ssr";
import type { Provider } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import type { Database, MemoSupabaseClient } from "@web-memo/shared/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * 요청마다 새 서버 클라이언트를 만든다.
 * @description 모듈 스코프에 캐시하지 않는 것이 의도다. 서버에서는 모듈 변수가 요청 사이에
 * 공유되므로 인스턴스를 재사용하면 한 사용자의 세션이 다른 요청으로 새어 나간다. 예전에는
 * `let supabaseClient`를 선언하고 싱글턴처럼 보이는 분기가 있었지만 어디에서도 대입하지 않아
 * 실제로는 매번 새로 만들고 있었다. "싱글턴이 안 되고 있네" 하고 고치면 세션이 섞이므로,
 * 오해를 없애려고 그 분기를 걷어냈다.
 */
export const getSupabaseClient = () => {
	const cookieStore = cookies();

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

export const signInWithOAuth = async (provider: Provider) => {
	"use server";
	const supabaseClient = getSupabaseClient();

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

export const signInWithEmail = async (email: string, password: string) => {
	"use server";
	const supabaseClient = getSupabaseClient();
	const { error } = await supabaseClient.auth.signInWithPassword({
		email,
		password,
	});

	if (error) redirect(PATHS.error);
	revalidatePath(PATHS.root, "layout");
	redirect(`${CONFIG.webUrl}${PATHS.callbackEmail}`);
};
