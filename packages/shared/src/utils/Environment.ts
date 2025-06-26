import { CONFIG } from "@web-memo/env";

export const isMac = () =>
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad|iPod/.test(navigator.platform);
export const isProduction = () => CONFIG.nodeEnv === "production";
export const isExtension = () =>
	typeof chrome !== "undefined" && typeof chrome.management !== "undefined";
