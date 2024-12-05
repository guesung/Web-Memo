import { QUERY_KEY } from '@src/constants';
import type { CategorySupabaseResponse, CategoryTable, MemoSupabaseClient } from '@src/types';
import { CategoryService } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseCategoryPostMutationProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryPostMutation({ supabaseClient }: UseCategoryPostMutationProps) {
  const queryClient = useQueryClient();

  return useMutation<CategorySupabaseResponse, Error, CategoryTable['Insert']>({
    mutationFn: categoryRequest => new CategoryService(supabaseClient).insertCategory(categoryRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
    },
  });
}
