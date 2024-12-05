import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { CategoryService } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

interface UseCategoryQueryProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryQuery({ supabaseClient }: UseCategoryQueryProps) {
  const query = useSuspenseQuery({
    queryFn: () => new CategoryService(supabaseClient).getCategories(),
    queryKey: QUERY_KEY.category(),
  });

  return {
    ...query,
    categories: query.data?.data,
  };
}
