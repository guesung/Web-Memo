import { LocalStorageKeyType } from './type';

export default class LocalStorage {
  static get<T>(key: LocalStorageKeyType): T | null {
    return JSON.parse(localStorage.getItem(key) ?? '');
  }

  static set(key: LocalStorageKeyType, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
