import { QUERY_KEY } from '@extension/shared/constants';
import { MemoSupabaseResponse } from '@extension/shared/types';
import { deleteMemos } from '@extension/shared/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseClient from './useSupabaseClient';

export default function useDeleteMemosMutation() {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();

  return useMutation<MemoSupabaseResponse, Error, number[]>({
    mutationFn: (idList: number[]) => deleteMemos(supabaseClient, idList),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    },
  });
}
