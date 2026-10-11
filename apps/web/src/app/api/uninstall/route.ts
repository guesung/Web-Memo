import { CONFIG } from "@web-memo/env";
import { ANALYTICS, PATHS } from "@web-memo/shared/constants";
import { type NextRequest, NextResponse } from "next/server";

const CLIENT_ID_PATTERN =
	/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|session-[0-9]{10,15}-[a-z0-9]{1,16})$/i;
const VERSION_PATTERN = /^[0-9]{1,5}(?:\.[0-9]{1,5}){0,3}$/;

const redirectToUninstall = (request: NextRequest) =>
	NextResponse.redirect(new URL(PATHS.uninstall, request.url), {
		status: 302,
		headers: {
			"Cache-Control": "no-store",
			"Referrer-Policy": "no-referrer",
			"X-Robots-Tag": "noindex",
		},
	});

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const rawClientId = searchParams.get("cid");
	const clientId =
		rawClientId && CLIENT_ID_PATTERN.test(rawClientId)
			? rawClientId
			: crypto.randomUUID();
	const rawVersion = searchParams.get("v");
	const extensionVersion =
		rawVersion && VERSION_PATTERN.test(rawVersion) ? rawVersion : "unknown";

	if (CONFIG.buildEnv !== "development") {
		const url = new URL("https://www.google-analytics.com/mp/collect");
		url.searchParams.set("measurement_id", ANALYTICS.gaId);
		url.searchParams.set("api_secret", ANALYTICS.gaApiSecret);

		try {
			const response = await fetch(url, {
				method: "POST",
				body: JSON.stringify({
					client_id: clientId,
					events: [
						{
							name: "extension_uninstall",
							params: {
								event_category: "engagement",
								engagement_time_msec: 100,
								session_id: Date.now().toString(),
								extension_version: extensionVersion,
								build_env: CONFIG.buildEnv,
								...(CONFIG.buildEnv === "staging" ? { debug_mode: true } : {}),
							},
						},
					],
				}),
				cache: "no-store",
				signal: AbortSignal.timeout(2_000),
			});

			if (!response.ok) {
				console.warn(
					"[analytics] extension_uninstall 전송 실패",
					response.status,
				);
			}
		} catch {
			console.warn("[analytics] extension_uninstall 전송 실패");
		}
	}

	return redirectToUninstall(request);
}

export function HEAD(request: NextRequest) {
	return redirectToUninstall(request);
}
