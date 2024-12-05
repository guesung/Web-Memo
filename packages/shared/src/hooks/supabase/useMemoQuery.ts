import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@src/types';
import { formatUrl, MemoService } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

interface UseMemoQueryProps {
  supabaseClient: MemoSupabaseClient;
  url?: string;
  id?: number;
}

export default function useMemoQuery({ supabaseClient, url, id }: UseMemoQueryProps) {
  const query = useSuspenseQuery({
    queryFn: () => new MemoService(supabaseClient).getMemos(),
    queryKey: QUERY_KEY.memos(),
    select: ({ data: memos }: MemoSupabaseResponse) => {
      if (memos?.length === 0) return;

      if (id) return memos?.find(memo => memo.id === id);
      if (url) return memos?.find(memo => memo.url === formatUrl(url));
      return;
    },
  });

  return {
    ...query,
    memo: query.data,
  };
}
