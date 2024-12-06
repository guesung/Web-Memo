import { QUERY_KEY } from '@src/constants';
import { CategoryService } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

export default function useCategoryDeleteMutation() {
  const queryClient = useQueryClient();
  const { data: supabaseClient } = useSupabaseQuery();

  return useMutation({
    mutationFn: new CategoryService(supabaseClient).deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
    },
  });
}
