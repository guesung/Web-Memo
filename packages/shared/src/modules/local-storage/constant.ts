import type { UpdateVersionType } from "./type";

const REGEXR_UPDATE_VERSION_VERSION = /^updateVersion\d+\.\d+\.\d+$/;

export const checkUpdateVersionKey = (
	value: string,
): value is UpdateVersionType => REGEXR_UPDATE_VERSION_VERSION.test(value);

export const LOCAL_STORAGE_KEYS = [
	"guide",
	"updateVersion",
	"install",
	"dismissedUpdateVersion",
] as const;
