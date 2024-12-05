import { QUERY_KEY } from '@src/constants';
import type { MemoSupabaseClient } from '@src/types';
import { MemoService } from '@src/utils';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

type QueryData = Awaited<ReturnType<MemoService['getMemos']>>;
type QueryError = Error;

interface UseMemosQueryProps extends Omit<UseQueryOptions<QueryData, QueryError>, 'queryKey' | 'queryFn'> {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemosQuery({ supabaseClient, ...useQueryProps }: UseMemosQueryProps) {
  const query = useQuery<QueryData, QueryError>({
    ...useQueryProps,
    queryFn: () => new MemoService(supabaseClient).getMemos(),
    queryKey: QUERY_KEY.memos(),
    enabled: !!supabaseClient,
  });

  return {
    ...query,
    memos: query.data?.data ?? [],
  };
}
