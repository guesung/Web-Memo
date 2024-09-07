import { MemoStorageType, MemoType, StorageType } from '../../types';

// ref : https://developer.chrome.com/docs/extensions/reference/api/storage
export const STORAGE_TYPE_OPTION_LANGUAGE = 'option_language';
const optionList = [STORAGE_TYPE_OPTION_LANGUAGE];

export const isUrlString = (key: string): key is string => {
  return !optionList.includes(key) && key.startsWith('http');
};

export class Storage {
  static async get(key?: string): Promise<StorageType> {
    const storage = await chrome.storage.sync.get(key);

    if (key) return storage[key];
    return storage as StorageType;
  }
  static async set(key: keyof StorageType, value: StorageType[keyof StorageType]): Promise<void> {
    await chrome.storage.sync.set({ [key]: value });
  }
}

export class MemoStorage {
  static async get() {
    const storage = await Storage.get();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { option_language, ...memoStorage } = storage;

    return memoStorage;
  }
  static async set(key: keyof MemoStorageType, value: MemoType): Promise<void> {
    await Storage.set(key as keyof StorageType, value);
  }
}

export class OptionStorage {
  static async get(key?: (typeof optionList)[number]): Promise<string> {
    const storage = await Storage.get(key);

    const { option_language } = storage;
    return option_language as string;
  }
}
