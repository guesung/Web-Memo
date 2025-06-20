import { CONFIG } from "@src/constants";

export const isProduction = CONFIG.nodeEnv === "production";
export const isExtension =
	typeof chrome !== "undefined" && typeof chrome.management !== "undefined";
