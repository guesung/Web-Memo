import { CategoryRow, CategoryTable, MemoSupabaseClient } from '@src/types';
import { updateCategory } from '@src/utils';
import { useMutation } from '@tanstack/react-query';

type MutationVariables = {
  id: CategoryRow['id'];
  categoryRequest: CategoryTable['Update'];
};
type MutationData = Awaited<ReturnType<typeof updateCategory>>;
type MutationError = Error;

interface UseCategoryPatchMutationProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryPatchMutation({ supabaseClient }: UseCategoryPatchMutationProps) {
  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: ({ id, categoryRequest }) => updateCategory(supabaseClient, id, categoryRequest),
  });
}
