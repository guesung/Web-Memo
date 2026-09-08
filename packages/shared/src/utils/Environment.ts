import { CONFIG } from "@web-memo/env";

export const isMac = () =>
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad|iPod/.test(navigator.platform);
// staging도 운영과 같이 동작해야 하므로(Sentry·Analytics·쿠키 secure) 개발만 제외합니다.
export const isProduction = () => CONFIG.buildEnv !== "development";
// chrome.management는 content script에 노출되지 않아 확장 안에서도 false가 됩니다.
// content script에도 있는 chrome.runtime.id로 판정합니다. 웹 페이지의 chrome.runtime에는 id가 없습니다.
export const isExtension = () =>
	typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
export function isServer() {
	return typeof window === "undefined" || "Deno" in globalThis;
}
