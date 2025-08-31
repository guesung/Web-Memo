import { CLIENT_CONFIG } from "@web-memo/env";

export const isMac = () =>
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad|iPod/.test(navigator.platform);
export const isProduction = () => CLIENT_CONFIG.nodeEnv === "production";
export const isExtension = () =>
	typeof chrome !== "undefined" && typeof chrome.management !== "undefined";
export function isServer() {
	return typeof window === "undefined" || "Deno" in globalThis;
}
