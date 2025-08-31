import { createServerClient } from "@supabase/ssr";
import type { Provider } from "@supabase/supabase-js";
import { CLIENT_CONFIG } from "@web-memo/env";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import type { Database, MemoSupabaseClient } from "@web-memo/shared/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

let supabaseClient: MemoSupabaseClient;

export const getSupabaseClient = () => {
	if (supabaseClient) return supabaseClient;

	const cookieStore = cookies();

	return createServerClient<Database, "memo", Database["memo"]>(
		CLIENT_CONFIG.supabaseUrl,
		CLIENT_CONFIG.supabaseAnonKey,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) =>
						cookieStore.set(name, value, options),
					);
				},
			},
			db: { schema: SUPABASE.table.memo },
		},
	);
};

export const signInWithOAuth = async (provider: Provider) => {
	"use server";
	const supabaseClient = getSupabaseClient();

	const { error, data } = await supabaseClient.auth.signInWithOAuth({
		provider,
		options: {
			redirectTo: `${CLIENT_CONFIG.webUrl}${PATHS.callbackOAuth}`,
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
	redirect(`${CLIENT_CONFIG.webUrl}${PATHS.callbackEmail}`);
};
