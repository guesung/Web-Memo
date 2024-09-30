import { StorageMemoType, MemoType, StorageType, StorageOptionKeyType } from '@src/types';
import { I18n } from './i18n';

export const STORAGE_TYPE_OPTION_LANGUAGE = 'option_language';
export const STORAGE_TYPE_OPTION_STORAGE = 'storage';
export const STORAGE_TYPE_OPTION_LIST = [STORAGE_TYPE_OPTION_LANGUAGE, STORAGE_TYPE_OPTION_STORAGE];

function isKeyStorageOption(key: StorageOptionKeyType): key is StorageOptionKeyType {
  if (STORAGE_TYPE_OPTION_LIST.includes(key)) return true;
  return false;
}

// ref : https://developer.chrome.com/docs/extensions/reference/api/storage
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
  static async set(key: keyof StorageMemoType, value: MemoType): Promise<void> {
    await Storage.set(key as keyof StorageType, value);
  }
  static async remove(key: keyof StorageMemoType): Promise<void> {
    await Storage.remove(key as keyof StorageType);
  }
}

export class OptionStorage {
  static async get(key: string): Promise<string | null> {
    const storage = await Storage.get(key);

    if (!isKeyStorageOption(key)) return null;

    if (!storage) throw new Error(I18n.get('error_get_storage'));
    const { option_language } = storage;
    return option_language as string;
  }
}
