// ref : https://developer.chrome.com/docs/extensions/reference/api/storage
export class Storage {
  static async get<T>(key?: string): Promise<T> {
    if (key) return (await chrome.storage.sync.get(key)) as T;
    return (await chrome.storage.sync.get()) as T;
  }
  static async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.sync.set({ [key]: value });
  }
}
