import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseResponse } from '@src/types';
import { QueryFunction, QueryKey, useSuspenseQuery } from '@tanstack/react-query';

interface UseSupabaseClientProps {
  getSupabaseClient: QueryFunction<MemoSupabaseResponse, QueryKey>;
}

export default function useSupabaseClient({ getSupabaseClient }: UseSupabaseClientProps) {
  return useSuspenseQuery({
    queryFn: getSupabaseClient,
    queryKey: QUERY_KEY.supabaseClient(),
    retry: 1,
  });
}
