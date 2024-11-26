import { LocalStorageKeyType } from '.';

export default class LocalStorage {
  static get(key: LocalStorageKeyType) {
    return JSON.parse(localStorage.getItem(key) ?? '');
  }

  static set(key: LocalStorageKeyType, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
