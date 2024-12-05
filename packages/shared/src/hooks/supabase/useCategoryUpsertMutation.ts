import { CategoryTable } from '@src/types';
import { CategoryService } from '@src/utils';
import { useMutation } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

type MutationVariables = {
  categoryRequest: CategoryTable['Insert'][];
};
type MutationData = Awaited<ReturnType<CategoryService['upsertCategories']>>;
type MutationError = Error;

export default function useCategoryUpsertMutation() {
  const { data: supabaseClient } = useSupabaseQuery();

  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: ({ categoryRequest }) => new CategoryService(supabaseClient).upsertCategories(categoryRequest),
  });
}
