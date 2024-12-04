import { CategoryTable, MemoSupabaseClient } from '@src/types';
import { upsertCategories } from '@src/utils';
import { useMutation } from '@tanstack/react-query';

type MutationVariables = {
  categoryRequest: CategoryTable['Insert'][];
};
type MutationData = Awaited<ReturnType<typeof upsertCategories>>;
type MutationError = Error;

interface UseCategoryUpsertMutationProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useCategoryUpsertMutation({ supabaseClient }: UseCategoryUpsertMutationProps) {
  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: ({ categoryRequest }) => upsertCategories(supabaseClient, categoryRequest),
  });
}
