export const LOCAL_STORAGE_KEY_MAP = {
  guide: 'guide',
  updateVersion: 'updateVersion',
  install: 'install',
} as const;

export const LOCAL_STORAGE_VALUE_MAP = {
  true: 'true',
} as const;

export type LocalStorageType = (typeof LOCAL_STORAGE_KEY_MAP)[keyof typeof LOCAL_STORAGE_KEY_MAP];

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
