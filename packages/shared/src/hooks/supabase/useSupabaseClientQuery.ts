import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { isExtension } from '@src/utils/Environment';
import { getSupabaseClient as getSupabaseClientExtension } from '@src/utils/extension';
import { getSupabaseClient as getSupabaseClientWeb } from '@src/utils/web';
import { useSuspenseQuery } from '@tanstack/react-query';

export default function useSupabaseClientQuery() {
  const query = useSuspenseQuery({
    queryFn: isExtension ? getSupabaseClientExtension : getSupabaseClientWeb,
    queryKey: QUERY_KEY.supabaseClient(),
  });

  return {
    ...query,
    data: query.data as MemoSupabaseClient,
  };
}
