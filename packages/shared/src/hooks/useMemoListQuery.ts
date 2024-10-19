import { queryKeys } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { getMemoSupabase } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseMemoListQueryProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemoListQuery({ supabaseClient }: UseMemoListQueryProps) {
  return useQuery({
    queryFn: getMemoSupabase.bind(null, supabaseClient),
    queryKey: queryKeys.memoList(),
    enabled: !!supabaseClient,
  });
}
