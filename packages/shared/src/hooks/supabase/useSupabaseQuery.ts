import { QUERY_KEY } from '@src/constants';
import { isExtension } from '@src/utils/Environment';
import { getSupabaseClient as getSupabaseClientExtension } from '@src/utils/extension';
import { getSupabaseClient as getSupabaseClientWeb } from '@src/utils/web';
import { useSuspenseQuery } from '@tanstack/react-query';

export default function useSupabaseQuery() {
  return useSuspenseQuery({
    queryFn: isExtension ? getSupabaseClientExtension : getSupabaseClientWeb,
    queryKey: QUERY_KEY.supabaseClient(),
  });
}
