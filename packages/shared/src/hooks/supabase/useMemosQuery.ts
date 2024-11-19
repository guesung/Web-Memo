import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { getMemo } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseMemosQueryProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemosQuery({ supabaseClient }: UseMemosQueryProps) {
  const query = useQuery({
    queryFn: getMemo.bind(null, supabaseClient),
    queryKey: QUERY_KEY.memos(),
    enabled: !!supabaseClient,
  });

  return {
    ...query,
    memos: query.data?.data,
  };
}
