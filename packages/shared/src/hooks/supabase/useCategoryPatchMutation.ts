import { CategoryRow, CategoryTable } from '@src/types';
import { CategoryService } from '@src/utils';
import { useMutation } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

type MutationVariables = {
  id: CategoryRow['id'];
  categoryRequest: CategoryTable['Update'];
};
type MutationData = Awaited<ReturnType<CategoryService['updateCategory']>>;
type MutationError = Error;

export default function useCategoryPatchMutation() {
  const { data: supabaseClient } = useSupabaseQuery();

  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: ({ id, categoryRequest }) => new CategoryService(supabaseClient).updateCategory(id, categoryRequest),
  });
}
