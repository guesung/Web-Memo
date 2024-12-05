import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { formatUrl, MemoService } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

interface UseMemoQueryProps {
  supabaseClient: MemoSupabaseClient;
  url?: string;
  id?: number;
}

export default function useMemoQuery({ url, id }: Omit<UseMemoQueryProps, 'supabaseClient'>) {
  const { data: supabaseClient } = useSupabaseQuery();

  const query = useSuspenseQuery({
    queryFn: () => new MemoService(supabaseClient).getMemos(),
    queryKey: QUERY_KEY.memos(),
    select: ({ data: memos }) => {
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
