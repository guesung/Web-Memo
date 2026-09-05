import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE } from "../../constants";
import type { Database } from "../../types";

export const getSupabaseClient = () => {
	return createBrowserClient<Database, "memo">(SUPABASE.url, SUPABASE.anonKey, {
		auth: {
			storage: {
				getItem: (key: string) => {
					return (
						document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`))?.[2] ?? ""
					);
				},
				setItem: (key: string, value: string) => {
					document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Strict; Secure`;
				},
				removeItem: (key: string) => {
					document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
				},
			},
		},
		db: { schema: SUPABASE.schema.memo },
	});
};

const createFeedbackSupabaseClient = () =>
	createBrowserClient<Database, "feedback">(SUPABASE.url, SUPABASE.anonKey, {
		db: { schema: SUPABASE.schema.feedback },
		isSingleton: false,
	});

let feedbackSupabaseClient: ReturnType<
	typeof createFeedbackSupabaseClient
> | null = null;

export const getFeedbackSupabaseClient = () => {
	if (!feedbackSupabaseClient) {
		feedbackSupabaseClient = createFeedbackSupabaseClient();
	}

	return feedbackSupabaseClient;
};
