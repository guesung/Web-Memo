import { queryKeys } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@src/types';
import { formatUrl, getMemo } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseMemoQueryProps {
  supabaseClient: MemoSupabaseClient;
  url?: string;
  id?: string;
}

interface FindMemoProps {
  memoList: MemoSupabaseResponse['data'];
  url?: string;
  id?: string;
}

const findMemo = ({ memoList, url, id }: FindMemoProps) => {
  if (url) return memoList?.find(memo => memo.url === formatUrl(url));
  if (id) return memoList?.find(memo => String(memo.id) === id);
  return null;
};

export default function useMemoQuery({ supabaseClient, url, id }: UseMemoQueryProps) {
  return useQuery({
    queryFn: getMemo.bind(null, supabaseClient),
    queryKey: queryKeys.memoList(),
    enabled: !!supabaseClient,
    select: ({ data: memoList }: MemoSupabaseResponse) => {
      return findMemo({ memoList, url, id });
    },
  });
}
