import { QUERY_KEY } from '@src/constants';
import { CategoryService } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

export default function useCategoryPostMutation() {
  const queryClient = useQueryClient();
  const { data: supabaseClient } = useSupabaseQuery();

  return useMutation({
    mutationFn: new CategoryService(supabaseClient).insertCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
    },
  });
}
