import { LOCAL_STORAGE_VALUE_MAP, LocalStorageKeyType, UpdateVersionType } from '.';

export default class LocalStorage {
  static get(key: LocalStorageKeyType) {
    return JSON.parse(localStorage.getItem(key) ?? '');
  }

  static set(key: LocalStorageKeyType, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
