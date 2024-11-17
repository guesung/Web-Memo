import { queryKeys } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { getCategory } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseCategoryQueryProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryQuery({ supabaseClient }: UseCategoryQueryProps) {
  return useQuery({
    queryFn: getCategory.bind(null, supabaseClient),
    queryKey: queryKeys.category(),
    enabled: !!supabaseClient,
  });
}
