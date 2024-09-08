import { MemoStorage } from '../bridge/shared';
import { MemoStorageType } from '../types';

export const backupMemo = async (): Promise<MemoStorageType> => {
  const memoStorage = await MemoStorage.get();
  return memoStorage;
};
