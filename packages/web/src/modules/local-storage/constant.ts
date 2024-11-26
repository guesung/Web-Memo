import { UpdateVersionType, LocalStorageKeyType } from '.';

const REGEXR_UPDATE_VERSION_VERSION = /^updateVersion\d+\.\d+\.\d+$/;

export const checkUpdateVersionKey = (value: string): value is UpdateVersionType =>
  REGEXR_UPDATE_VERSION_VERSION.test(value);

export const LOCAL_STORAGE_KEY = ['guide', 'updateVersion', 'install'] as const;

export const checkLocalStorageKey = (value: string): value is LocalStorageKeyType =>
  checkUpdateVersionKey(value) || (LOCAL_STORAGE_KEY as readonly string[]).includes(value);

export const LOCAL_STORAGE_VALUE_MAP = {
  true: 'true',
} as const;
