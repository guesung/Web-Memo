import { queryKeys } from '@src/constants';
import type { CategoryTableInsert, MemoSupabaseClient, CategorySupabaseResponse } from '@src/types';
import { insertCategory } from '@src/utils';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

interface PostCategoryProps extends CategoryTableInsert {}

interface UseCategoryPostMutationProps extends UseMutationOptions<CategorySupabaseResponse, Error, PostCategoryProps> {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryPostMutation({ supabaseClient, ...useMutationProps }: UseCategoryPostMutationProps) {
  const queryClient = useQueryClient();

  return useMutation<CategorySupabaseResponse, Error, PostCategoryProps>({
    ...useMutationProps,
    mutationFn: async (postCategoryProps: PostCategoryProps) => await insertCategory(supabaseClient, postCategoryProps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.category() });
    },
  });
}
