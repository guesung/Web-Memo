import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@src/types';
import { formatUrl, getMemo } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseMemoQueryProps {
  supabaseClient: MemoSupabaseClient;
  url?: string;
  id?: number;
}

interface FindMemoProps {
  memos: MemoSupabaseResponse['data'];
  url?: string;
  id?: number;
}

const findMemo = ({ memos, url, id }: FindMemoProps) => {
  if (url) return memos?.find(memo => memo.url === formatUrl(url));
  if (id) return memos?.find(memo => memo.id === id);
  return null;
};

export default function useMemoQuery({ supabaseClient, url, id }: UseMemoQueryProps) {
  return useQuery({
    queryFn: () => getMemo(supabaseClient),
    queryKey: QUERY_KEY.memos(),
    enabled: !!supabaseClient,
    select: ({ data: memos }: MemoSupabaseResponse) => {
      return findMemo({ memos, url, id });
    },
  });
}
