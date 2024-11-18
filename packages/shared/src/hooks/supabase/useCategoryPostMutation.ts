import { queryKeys } from '@src/constants';
import type { CategorySupabaseResponse, CategoryTable, MemoSupabaseClient } from '@src/types';
import { insertCategory } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseCategoryPostMutationProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryPostMutation({ supabaseClient }: UseCategoryPostMutationProps) {
  const queryClient = useQueryClient();

  return useMutation<CategorySupabaseResponse, Error, CategoryTable['Insert']>({
    mutationFn: async postCategoryProps => await insertCategory(supabaseClient, postCategoryProps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.category() });
    },
  });
}
