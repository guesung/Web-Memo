import { QUERY_KEY } from '@src/constants';
import { MemoService } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

import useSupabaseClientQuery from './useSupabaseClientQuery';

type QueryData = Awaited<ReturnType<MemoService['getMemos']>>;
type QueryError = Error;

export default function useMemosQuery() {
  const { data: supabaseClient } = useSupabaseClientQuery();

  const query = useSuspenseQuery<QueryData, QueryError>({
    queryFn: () => new MemoService(supabaseClient).getMemos(),
    queryKey: QUERY_KEY.memos(),
  });

  return {
    ...query,
    memos: query.data?.data ?? [],
  };
}
