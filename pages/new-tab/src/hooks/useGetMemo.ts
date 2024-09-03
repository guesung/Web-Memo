import { MemoStorage, MemoType, SyncStorage, useDidMount } from '@extension/shared';
import { useState } from 'react';

export default function useGetMemo() {
  const [memoList, setMemoList] = useState<MemoType[]>([]);

  useDidMount(async () => {
    const storage = await SyncStorage.get<MemoStorage>();
    setMemoList(Object.values(storage));
  });
  return { memoList };
}
