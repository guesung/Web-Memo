import { queryKeys } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { getMemo } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseMemoListQueryProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemoListQuery({ supabaseClient }: UseMemoListQueryProps) {
  const query = useQuery({
    queryFn: getMemo.bind(null, supabaseClient),
    queryKey: queryKeys.memoList(),
    enabled: !!supabaseClient,
  });

  return {
    ...query,
    memos: query.data?.data,
  };
}
