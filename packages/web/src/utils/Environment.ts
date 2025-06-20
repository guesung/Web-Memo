export const isProduction = process.env.NODE_ENV === "production";
export const isServer = typeof window === "undefined";
export const isMac =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad|iPod/.test(navigator.platform);
