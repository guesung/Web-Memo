import { QUERY_KEY } from '@src/constants';
import type { MemoSupabaseClient } from '@src/types';
import { MemoService } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

type QueryData = Awaited<ReturnType<MemoService['getMemos']>>;
type QueryError = Error;

interface UseMemosQueryProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemosQuery({ supabaseClient }: UseMemosQueryProps) {
  const query = useSuspenseQuery<QueryData, QueryError>({
    queryFn: () => new MemoService(supabaseClient).getMemos(),
    queryKey: QUERY_KEY.memos(),
  });

  return {
    ...query,
    memos: query.data?.data ?? [],
  };
}
