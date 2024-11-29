import { StorageKeyType } from '@src/types';

import { I18n } from './I18n';

export class Storage {
  static async get<T>(key: StorageKeyType): Promise<T> {
    try {
      const storage = await chrome.storage.sync.get(key);
      return storage[key];
    } catch (error) {
      throw new Error(I18n.get('error_get_storage'));
    }
  }
  static set(key: StorageKeyType, value: unknown) {
    return chrome.storage.sync.set({ [key]: value });
  }
  static remove(key: StorageKeyType) {
    return chrome.storage.sync.remove(key);
  }
}
