import { LocalStorageKeyType } from './type';

export default class LocalStorage {
  static get<T>(key: LocalStorageKeyType): T | null {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  static set(key: LocalStorageKeyType, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static remove(key: LocalStorageKeyType) {
    localStorage.removeItem(key);
  }
}
