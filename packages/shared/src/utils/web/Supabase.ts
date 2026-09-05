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
		// 아래 getFeedbackSupabaseClient의 설명 참고.
		isSingleton: false,
	});

let feedbackSupabaseClient: ReturnType<
	typeof createFeedbackSupabaseClient
> | null = null;

/**
 * 피드백 스키마 Supabase 클라이언트를 반환한다.
 * @description `@supabase/ssr`의 `createBrowserClient`는 브라우저에서 인스턴스를 모듈 변수
 * 하나에 캐시하는데, 그 캐시가 스키마별로 나뉘지 않는다. 그래서 메모 스키마 클라이언트를 먼저
 * 만든 뒤 이 함수를 부르면 메모 클라이언트가 돌아온다. `isSingleton: false`로 공유 캐시를
 * 비켜가고, 대신 인스턴스 재사용은 여기서 직접 한다.
 */
export const getFeedbackSupabaseClient = () => {
	if (!feedbackSupabaseClient) {
		feedbackSupabaseClient = createFeedbackSupabaseClient();
	}

	return feedbackSupabaseClient;
};
