import type { BasicStorageKeyType, LocalStorageKeyType, UpdateVersionType } from './type';

const REGEXR_UPDATE_VERSION_VERSION = /^updateVersion\d+\.\d+\.\d+$/;

export const checkUpdateVersionKey = (value: string): value is UpdateVersionType =>
  REGEXR_UPDATE_VERSION_VERSION.test(value);

export const LOCAL_STORAGE_KEYS = ['guide', 'updateVersion', 'install'] as const;

const isBasicStorageKey = (value: string): value is BasicStorageKeyType =>
  LOCAL_STORAGE_KEYS.includes(value as BasicStorageKeyType);

export const checkLocalStorageKey = (value: string): value is LocalStorageKeyType =>
  checkUpdateVersionKey(value) || isBasicStorageKey(value);
