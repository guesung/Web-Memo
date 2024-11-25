import { QUERY_KEY } from '@src/constants';
import type { CategorySupabaseResponse, CategoryTable, MemoSupabaseClient } from '@src/types';
import { insertCategory } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseCategoryPostMutationProps {
  supabaseClient: MemoSupabaseClient;
}

// TODO : 낙관적 업데이트
export default function useCategoryPostMutation({ supabaseClient }: UseCategoryPostMutationProps) {
  const queryClient = useQueryClient();

  return useMutation<CategorySupabaseResponse, Error, CategoryTable['Insert']>({
    mutationFn: postCategoryProps => insertCategory(supabaseClient, postCategoryProps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.category() });
    },
  });
}
