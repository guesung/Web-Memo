import { MemoType } from '../../types';
import { MemoStorage } from './module';

export const getMemoList = async (): Promise<MemoType[]> => {
  const memoStorage = await MemoStorage.get();
  const memoList = Object.values(memoStorage).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return memoList;
};
