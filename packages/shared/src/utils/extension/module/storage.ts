import { MemoStorageType, MemoType, StorageType } from '@src/types';
import { I18n } from './i18n';

// ref : https://developer.chrome.com/docs/extensions/reference/api/storage
export const STORAGE_TYPE_OPTION_LANGUAGE = 'option_language';
const optionList = [STORAGE_TYPE_OPTION_LANGUAGE];

export class Storage {
  static async get(key?: string): Promise<StorageType | undefined> {
    try {
      const storage = await chrome.storage.sync.get(key);
      if (key) return storage[key];
      return storage;
    } catch (error) {
      throw new Error(I18n.get('error_get_storage'));
    }
  }
  static async set(key: keyof StorageType, value: StorageType[keyof StorageType]): Promise<void> {
    await chrome.storage.sync.set({ [key]: value });
  }
  static async remove(key: keyof StorageType): Promise<void> {
    await chrome.storage.sync.remove(key);
  }
}

export class MemoStorage {
  static async get() {
    const storage = await Storage.get();

    if (!storage) throw new Error(I18n.get('error_get_storage'));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { option_language, ...memoStorage } = storage;

    return memoStorage;
  }
  static async set(key: keyof MemoStorageType, value: MemoType): Promise<void> {
    await Storage.set(key as keyof StorageType, value);
  }
  static async remove(key: keyof MemoStorageType): Promise<void> {
    await Storage.remove(key as keyof StorageType);
  }
}

export class OptionStorage {
  static async get(key?: (typeof optionList)[number]): Promise<string> {
    const storage = await Storage.get(key);

    if (!storage) throw new Error(I18n.get('error_get_storage'));
    const { option_language } = storage;
    return option_language as string;
  }
}
