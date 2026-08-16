import { Linking } from "react-native";

/** 웹뷰가 직접 로드할 수 있는 URL 스킴 */
const IN_APP_SCHEMES = ["http:", "https:", "about:", "data:"];

/** Android intent:// URL의 브라우저 폴백 URL 파라미터 */
const INTENT_FALLBACK_URL_PATTERN = /S\.browser_fallback_url=([^;]+)/;

/**
 * 웹뷰 내부에서 그대로 로드할 수 있는 URL인지 판별한다.
 * @description http/https 등 일반 웹 스킴이면 true, intent·market·tel처럼 외부 앱을 여는 스킴이면 false.
 */
export function isInAppLoadableUrl(url: string): boolean {
	const schemeEndIndex = url.indexOf(":");
	if (schemeEndIndex === -1) return true;

	const scheme = url.slice(0, schemeEndIndex + 1).toLowerCase();

	return IN_APP_SCHEMES.includes(scheme);
}

/**
 * 웹뷰가 처리할 수 없는 URL을 외부 앱·스토어로 연다.
 * @description 앱이 설치돼 있지 않아 열기에 실패하면 intent:// 에 담긴 브라우저 폴백 URL을 돌려준다.
 * @returns 웹뷰에서 대신 로드할 폴백 URL. 없으면 null.
 */
export async function openExternalUrl(url: string): Promise<string | null> {
	try {
		await Linking.openURL(url);

		return null;
	} catch {
		return extractIntentFallbackUrl(url);
	}
}

/** Android intent:// URL에 포함된 브라우저 폴백 URL을 추출한다. */
function extractIntentFallbackUrl(url: string): string | null {
	const matched = url.match(INTENT_FALLBACK_URL_PATTERN);
	if (!matched) return null;

	try {
		return decodeURIComponent(matched[1]);
	} catch {
		return null;
	}
}
