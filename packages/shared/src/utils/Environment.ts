import { CONFIG } from "@web-memo/env";

export const isMac = () =>
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad|iPod/.test(navigator.platform);
// staging도 운영과 같이 동작해야 하므로(Sentry·Analytics·쿠키 secure) 개발만 제외합니다.
export const isProduction = () => CONFIG.buildEnv !== "development";
/**
 * 실사용자에게 나가는 운영 빌드인지 판정합니다.
 *
 * @description `isProduction()` 은 staging도 참으로 봅니다. 그래서 "운영에서만 숨길 것"을
 * 가리는 데는 쓸 수 없습니다 — staging에서도 같이 숨겨집니다. 테스트 로그인 버튼처럼
 * staging에는 보여야 하는 것은 이 판정을 쓰세요.
 */
export const isProductionBuild = () => CONFIG.buildEnv === "production";
export const isExtension = () =>
	typeof chrome !== "undefined" && typeof chrome.management !== "undefined";
export function isServer() {
	return typeof window === "undefined" || "Deno" in globalThis;
}
