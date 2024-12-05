import { QUERY_KEY } from '@src/constants';
import { MemoService } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

type QueryData = Awaited<ReturnType<MemoService['getMemos']>>;
type QueryError = Error;

export default function useMemosQuery() {
  const { data: supabaseClient } = useSupabaseQuery();


  const query = useSuspenseQuery<QueryData, QueryError>({
    queryFn: () => new MemoService(supabaseClient).getMemos(),
    queryKey: QUERY_KEY.memos(),
  });

  return {
    ...query,
    memos: query.data?.data ?? [],
  };
}
