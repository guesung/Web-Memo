import { CategoryRow } from '@src/types';
import { CategoryService } from '@src/utils';
import { useMutation } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

type MutationVariables = {
  id: CategoryRow['id'];
};
type MutationData = Awaited<ReturnType<CategoryService['deleteCategory']>>;
type MutationError = Error;

export default function useCategoryDeleteMutation() {
  const { data: supabaseClient } = useSupabaseQuery();

  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: ({ id }) => new CategoryService(supabaseClient).deleteCategory(id),
  });
}
