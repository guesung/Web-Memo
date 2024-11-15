import { queryKeys } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@src/types';
import { formatUrl, getMemo } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseMemoQueryProps {
  supabaseClient: MemoSupabaseClient;
  url?: string;
}

export default function useMemoQuery({ supabaseClient, url }: UseMemoQueryProps) {
  return useQuery({
    queryFn: getMemo.bind(null, supabaseClient),
    queryKey: queryKeys.memoList(),
    enabled: !!supabaseClient,
    select: ({ data: memoList }: MemoSupabaseResponse) => {
      const currentMemo = memoList?.find(memo => memo.url === formatUrl(url));
      return currentMemo;
    },
  });
}
