import { QUERY_KEY } from '@src/constants';
import { CategoryService } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

export default function useCategoryQuery() {
  const { data: supabaseClient } = useSupabaseQuery();

  const query = useSuspenseQuery({
    queryFn: () => new CategoryService(supabaseClient).getCategories(),
    queryKey: QUERY_KEY.category(),
  });

  return {
    ...query,
    categories: query.data?.data,
  };
}
