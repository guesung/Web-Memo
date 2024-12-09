import { QUERY_KEY } from '@src/constants';
import { CategoryService } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

import useSupabaseClientQuery from './useSupabaseClientQuery';

export default function useCategoryQuery() {
  const { data: supabaseClient } = useSupabaseClientQuery();

  const query = useSuspenseQuery({
    queryFn: new CategoryService(supabaseClient).getCategories,
    queryKey: QUERY_KEY.category(),
  });

  return {
    ...query,
    categories: query.data?.data,
  };
}
