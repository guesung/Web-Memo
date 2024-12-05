import { QUERY_KEY } from '@src/constants';
import { isExtension } from '@src/utils/Environment';
import { getSupabaseClient as getSupabaseClientExtension } from '@src/utils/extension';
import { getSupabaseClient as getSupabaseClientWeb } from '@src/utils/web';
import { useQuery } from '@tanstack/react-query';

export default function useSupabaseQuery() {
  return useQuery({
    queryFn: isExtension ? getSupabaseClientExtension : getSupabaseClientWeb,
    queryKey: QUERY_KEY.supabaseClient(),
  });
}
