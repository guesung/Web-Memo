import { queryKeys } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@src/types';
import { getMemoSupabase } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseMemoListQueryProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemoListQuery({ supabaseClient }: UseMemoListQueryProps) {
  return useQuery<MemoSupabaseResponse, Error>({
    queryFn: getMemoSupabase.bind(null, supabaseClient),
    queryKey: queryKeys.memoList(),
    enabled: !!supabaseClient,
  });
}
