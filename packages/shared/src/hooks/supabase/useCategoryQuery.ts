import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { getCategories } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

interface UseCategoryQueryProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryQuery({ supabaseClient }: UseCategoryQueryProps) {
  const query = useSuspenseQuery({
    queryFn: () => getCategories(supabaseClient),
    queryKey: QUERY_KEY.category(),
  });

  return {
    ...query,
    categories: query.data?.data,
  };
}
