import { CategoryRow, MemoSupabaseClient } from '@src/types';
import { CategoryService } from '@src/utils';
import { useMutation } from '@tanstack/react-query';

type MutationVariables = {
  id: CategoryRow['id'];
};
type MutationData = Awaited<ReturnType<CategoryService['deleteCategory']>>;
type MutationError = Error;

interface UseCategoryDeleteMutationProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryDeleteMutation({ supabaseClient }: UseCategoryDeleteMutationProps) {
  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: ({ id }) => new CategoryService(supabaseClient).deleteCategory(id),
  });
}
