type UpdateVersionType = `updateVersion${number}.${number}.${number}`;

const REGEXR_UPDATE_VERSION_VERSION = /^updateVersion\d+\.\d+\.\d+$/;
export const checkUpdateVersionKey = (value: string): value is UpdateVersionType =>
  REGEXR_UPDATE_VERSION_VERSION.test(value);
export const checkLocalStorageKey = (value: string): value is LocalStorageType =>
  checkUpdateVersionKey(value) || Object.keys(LOCAL_STORAGE_KEY_MAP).includes(value);

export const LOCAL_STORAGE_KEY_MAP = {
  guide: 'guide',
  updateVersion: 'updateVersion',
  install: 'install',
} as const;

export const LOCAL_STORAGE_VALUE_MAP = {
  true: 'true',
} as const;

export type LocalStorageType = (typeof LOCAL_STORAGE_KEY_MAP)[keyof typeof LOCAL_STORAGE_KEY_MAP] | UpdateVersionType;

export class LocalStorage {
  static get(key: LocalStorageType) {
    return localStorage.getItem(key);
  }

  static set(key: LocalStorageType, value: string) {
    localStorage.setItem(key, value);
  }

  static setTrue(key: LocalStorageType) {
    this.set(key, LOCAL_STORAGE_VALUE_MAP.true);
  }

  static check(key: LocalStorageType) {
    return this.get(key) === LOCAL_STORAGE_VALUE_MAP.true;
  }
}
