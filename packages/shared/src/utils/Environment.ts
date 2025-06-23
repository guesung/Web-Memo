import { CONFIG } from "@web-memo/env";

export const isProduction = CONFIG.nodeEnv === "production";
export const isExtension =
	typeof chrome !== "undefined" && typeof chrome.management !== "undefined";
