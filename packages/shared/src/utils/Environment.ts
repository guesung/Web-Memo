import { CONFIG } from "@extension/env";

export const isProduction = CONFIG.nodeEnv === "production";
export const isExtension =
	typeof chrome !== "undefined" && typeof chrome.management !== "undefined";
