import {
	browserProfilingIntegration,
	browserTracingIntegration,
	init,
	setUser,
} from "@sentry/react";
import { SENTRY } from "../constants";
import { isExtension, isProduction } from "./Environment";
import { getSupabaseClient } from "./extension/Supabase";
import { AuthService } from "./Supabase";

const SENTRY_DSN = isExtension() ? SENTRY.dsnExtension : SENTRY.dsnWeb;

/**
 * 로그인된 확장 사용자의 id를 Sentry 스코프에 붙인다.
 *
 * @description 웹(`_utils/Sentry.ts`)은 로그인 시점에 `setUser`를 부르지만,
 * 확장은 그 훅이 없어 이슈에 누가 겪었는지가 안 남았다. 로그인 전이거나 세션
 * 조회가 실패해도 초기화 자체를 막으면 안 되므로 실패는 조용히 넘어간다.
 */
const setSentryUserForExtension = async () => {
	try {
		const supabaseClient = await getSupabaseClient();
		const { data } = await new AuthService(supabaseClient).getUser();

		if (data.user?.id) {
			setUser({ id: data.user.id });
		}
	} catch {
		// 로그인 전이거나 세션이 없는 상태. 보고 자체는 계속되어야 하므로 무시한다.
	}
};

export const initSentry = async () => {
	if (!isProduction()) return;

	init({
		dsn: SENTRY_DSN,
		integrations: [browserTracingIntegration(), browserProfilingIntegration()],

		tracesSampleRate: isExtension() ? 1.0 : 0,
		release: isExtension() ? chrome.runtime.getManifest().version : undefined,
	});

	if (isExtension()) {
		await setSentryUserForExtension();
	}
};
