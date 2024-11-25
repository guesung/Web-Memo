import { QUERY_KEY } from '@src/constants';
import { getSupabaseClient } from '@src/utils/extension';
import { useSuspenseQuery } from '@tanstack/react-query';

export default function useSupabaseClientQuery() {
  return useSuspenseQuery({
    queryFn: getSupabaseClient,
    queryKey: QUERY_KEY.supabaseClient(),
    retry: 1,
  });
}
