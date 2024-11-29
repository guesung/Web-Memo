import { StorageKeyType } from '@src/types';

import { I18n } from './I18n';

export class Storage {
  static async get<K extends StorageKeyType>(key: K) {
    try {
      const storage = await chrome.storage.sync.get(key);
      if (storage[key]) return storage[key];
      else return undefined;
    } catch (error) {
      throw new Error(I18n.get('error_get_storage'));
    }
  }
  static async set(key: StorageKeyType, value: string): Promise<void> {
    await chrome.storage.sync.set({ [key]: value });
  }
  static async remove(key: StorageKeyType): Promise<void> {
    await chrome.storage.sync.remove(key);
  }
}
