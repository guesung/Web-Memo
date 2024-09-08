import { MemoStorageType } from '../types';

export const loadMemo = async (memoStorage: MemoStorageType) => {
  await chrome.storage.sync.set(memoStorage);
};
