import {
	resolveMeasurementClientId,
	sendMeasurementProtocolEvent,
} from "@src/modules/ga/measurementProtocol";
import { DEFAULT_LANGUAGE, getLanguage } from "@src/modules/i18n";
import { PATHS } from "@web-memo/shared/constants";
import { after, type NextRequest, NextResponse } from "next/server";

const VERSION_PATTERN = /^[0-9]{1,5}(?:\.[0-9]{1,5}){0,3}$/;

/**
 * 언어가 붙은 제거 페이지로 바로 보냅니다.
 * @description `/uninstall`로 보내면 미들웨어가 언어를 붙이려고 한 번 더 리다이렉트합니다.
 * 언어는 미들웨어와 같은 `getLanguage`로 고릅니다.
 */
const redirectToUninstall = (request: NextRequest) => {
	const language = getLanguage(request) ?? DEFAULT_LANGUAGE;

	return NextResponse.redirect(
		new URL(`/${language}${PATHS.uninstall}`, request.url),
		{
			status: 302,
			headers: {
				"Cache-Control": "no-store",
				"Referrer-Policy": "no-referrer",
				"X-Robots-Tag": "noindex",
			},
		},
	);
};

export function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const clientId = resolveMeasurementClientId(searchParams.get("cid"));
	const rawVersion = searchParams.get("v");
	const extensionVersion =
		rawVersion && VERSION_PATTERN.test(rawVersion) ? rawVersion : "unknown";

	// 사용자가 GA 응답을 기다리지 않도록 응답을 먼저 보내고 전송은 그 뒤에 합니다.
	after(() =>
		sendMeasurementProtocolEvent({
			clientId,
			name: "extension_uninstall",
			category: "engagement",
			params: { extension_version: extensionVersion },
		}),
	);

	return redirectToUninstall(request);
}

export function HEAD(request: NextRequest) {
	return redirectToUninstall(request);
}
