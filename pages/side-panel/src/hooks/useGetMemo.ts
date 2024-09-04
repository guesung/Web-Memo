import { MemoStorage, Storage, urlToKey, useFetch } from '@extension/shared';

interface UseGetMemoProps {
  url: string;
}

export default function useGetMemo({ url }: UseGetMemoProps) {
  const { data: memoList } = useFetch<MemoStorage>({ fetchFn: Storage.get, defaultValue: {} });
  const memo = memoList?.[urlToKey(url)];

  return { memoList, memo };
}
