import { CategoryTable, MemoSupabaseClient } from '@src/types';
import { CategoryService } from '@src/utils';
import { useMutation } from '@tanstack/react-query';

type MutationVariables = {
  categoryRequest: CategoryTable['Insert'][];
};
type MutationData = Awaited<ReturnType<CategoryService['upsertCategories']>>;
type MutationError = Error;

interface UseCategoryUpsertMutationProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryUpsertMutation({ supabaseClient }: UseCategoryUpsertMutationProps) {
  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: ({ categoryRequest }) => new CategoryService(supabaseClient).upsertCategories(categoryRequest),
  });
}
