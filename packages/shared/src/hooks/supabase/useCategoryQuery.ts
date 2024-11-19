import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { getCategory } from '@src/utils';
import { useQuery } from '@tanstack/react-query';

interface UseCategoryQueryProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryQuery({ supabaseClient }: UseCategoryQueryProps) {
  const query = useQuery({
    queryFn: getCategory.bind(null, supabaseClient),
    queryKey: QUERY_KEY.category(),
    enabled: !!supabaseClient,
  });

  return {
    ...query,
    categories: query.data?.data,
  };
}
