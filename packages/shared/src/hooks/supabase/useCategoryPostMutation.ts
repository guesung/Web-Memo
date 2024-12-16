import { QUERY_KEY } from '@src/constants';
import { CategoryService } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseClientQuery from './useSupabaseClientQuery';

export default function useCategoryPostMutation() {
  const queryClient = useQueryClient();
  const { data: supabaseClient } = useSupabaseClientQuery();

  return useMutation({
    mutationFn: new CategoryService(supabaseClient).insertCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
    },
  });
}
