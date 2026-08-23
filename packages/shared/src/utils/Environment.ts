import { CONFIG } from "@web-memo/env";

export const isMac = () =>
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad|iPod/.test(navigator.platform);
// staging도 운영과 같이 동작해야 하므로(Sentry·Analytics·쿠키 secure) 개발만 제외합니다.
export const isProduction = () => CONFIG.buildEnv !== "development";
export const isExtension = () =>
	typeof chrome !== "undefined" && typeof chrome.management !== "undefined";
export function isServer() {
	return typeof window === "undefined" || "Deno" in globalThis;
}
