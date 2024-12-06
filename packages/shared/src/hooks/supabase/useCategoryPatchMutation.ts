import { QUERY_KEY } from '@src/constants';
import { CategoryService } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

export default function useCategoryPatchMutation() {
  const queryClient = useQueryClient();
  const { data: supabaseClient } = useSupabaseQuery();

  return useMutation({
    mutationFn: new CategoryService(supabaseClient).updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
    },
  });
}
