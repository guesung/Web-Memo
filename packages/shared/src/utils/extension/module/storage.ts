import { StorageMemoType, MemoType, StorageType, StorageOptionKeyType } from '@src/types';
import { I18n } from './i18n';
import { STORAGE_TYPE_OPTION_LIST } from '@src/constants';

function isKeyStorageOption(key: StorageOptionKeyType): key is StorageOptionKeyType {
  if (STORAGE_TYPE_OPTION_LIST.includes(key)) return true;
  return false;
}

// ref : https://developer.chrome.com/docs/extensions/reference/api/storage
export class Storage {
  static async get<T extends StorageType>(key?: string): Promise<T> {
    try {
      const storage = await chrome.storage.sync.get(key);
      if (key) {
        if (storage[key]) return storage[key];
        else throw new Error(I18n.get('error_get_storage'));
      }
      return storage as T;
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
    const { LANGUAGE, ...memoStorage } = storage;

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
  static async get(key: string): Promise<StorageType | null> {
    const storageValue = await Storage.get(key);

    if (key && !isKeyStorageOption(key)) return null;

    if (!storageValue) throw new Error(I18n.get('error_get_storage'));

    return storageValue;
  }
}
