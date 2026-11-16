import {
	resolveMeasurementClientId,
	sendMeasurementProtocolEvent,
} from "@src/modules/ga/measurementProtocol";
import { DEFAULT_LANGUAGE, getLanguage } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import { cookies } from "next/headers";
import { after, type NextRequest, NextResponse } from "next/server";

/** 이 경로로 바로 시작할 수 있는 제공자. 확장 사이드 패널이 버튼으로 내놓는 것과 같습니다. */
const START_PROVIDERS = ["kakao", "google"] as const;

/** `[lng]/layout.tsx`의 `ga-adopt-extension-client-id` 스크립트가 받는 형식과 같습니다. */
const EXTENSION_CLIENT_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** gtag가 쓰는 `_ga` 쿠키와 속성이 같아야 쿠키가 둘로 갈리지 않습니다. */
const GA_COOKIE_OPTIONS = {
	path: "/",
	maxAge: 34_560_000,
	sameSite: "lax",
	domain: ".webmemo.xyz",
} as const;

const isStartProvider = (
	value: string | null,
): value is (typeof START_PROVIDERS)[number] =>
	START_PROVIDERS.some((provider) => provider === value);

/**
 * 로그인 페이지를 거치지 않고 제공자 로그인 화면으로 바로 보냅니다.
 *
 * @description 확장 사이드 패널의 제공자 버튼이 새 탭으로 여는 경로입니다. 로그인 페이지가
 * 하던 두 가지를 여기서 대신합니다 — 확장의 client_id를 `_ga` 쿠키로 옮기는 일과
 * `login_start` 기록입니다. 페이지를 건너뛰므로 둘 다 브라우저 스크립트로는 할 수 없습니다.
 */
export async function GET(request: NextRequest) {
	const { searchParams, origin } = request.nextUrl;
	const language = getLanguage(request) ?? DEFAULT_LANGUAGE;
	const loginUrl = new URL(`${origin}/${language}${PATHS.login}`);
	const provider = searchParams.get("provider");

	if (!isStartProvider(provider)) {
		return NextResponse.redirect(loginUrl);
	}

	const supabaseClient = await getSupabaseClient();
	const { data, error } = await supabaseClient.auth.signInWithOAuth({
		provider,
		options: { redirectTo: `${CONFIG.webUrl}${PATHS.callbackOAuth}` },
	});

	if (error || !data.url) {
		loginUrl.searchParams.set("error", "1");

		return NextResponse.redirect(loginUrl);
	}

	const rawClientId = searchParams.get("ext_cid");

	if (rawClientId && EXTENSION_CLIENT_ID_PATTERN.test(rawClientId)) {
		const cookieStore = await cookies();
		cookieStore.set("_ga", `GA1.1.${rawClientId}`, GA_COOKIE_OPTIONS);
	}

	// 사용자가 GA 응답을 기다리지 않도록 응답을 먼저 보내고 전송은 그 뒤에 합니다.
	after(() =>
		sendMeasurementProtocolEvent({
			clientId: resolveMeasurementClientId(rawClientId),
			name: "login_start",
			category: "engagement",
			params: { method: provider },
		}),
	);

	return NextResponse.redirect(data.url, {
		headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
	});
}
