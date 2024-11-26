import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@src/types';
import { formatUrl, getMemos } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseMemoQueryProps {
  supabaseClient: MemoSupabaseClient;
  url?: string;
  id?: number;
}

export default function useMemoQuery({ supabaseClient, url, id }: UseMemoQueryProps) {
  const query = useQuery({
    queryFn: () => getMemos(supabaseClient),
    queryKey: QUERY_KEY.memos(),
    enabled: !!supabaseClient,
    select: ({ data: memos }: MemoSupabaseResponse) => {
      if (memos?.length === 0) return null;

      if (id) return memos?.find(memo => memo.id === id) ?? null;
      if (url) return memos?.find(memo => memo.url === formatUrl(url)) ?? null;
      return null;
    },
  });

  return {
    ...query,
    memo: query.data,
  };
}
