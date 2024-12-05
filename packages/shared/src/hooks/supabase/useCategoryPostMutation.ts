import { QUERY_KEY } from '@src/constants';
import type { CategorySupabaseResponse, CategoryTable } from '@src/types';
import { CategoryService } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

export default function useCategoryPostMutation() {
  const queryClient = useQueryClient();
  const { data: supabaseClient } = useSupabaseQuery();

  return useMutation<CategorySupabaseResponse, Error, CategoryTable['Insert']>({
    mutationFn: categoryRequest => new CategoryService(supabaseClient).insertCategory(categoryRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
    },
  });
}
