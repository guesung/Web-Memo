import { CONFIG } from "../constants";

export const isProduction = CONFIG.nodeEnv === "production";
export const isExtension =
	typeof chrome !== "undefined" && typeof chrome.management !== "undefined";
