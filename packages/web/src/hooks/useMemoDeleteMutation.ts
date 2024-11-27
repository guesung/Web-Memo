import { QUERY_KEY } from '@extension/shared/constants';
import { MemoSupabaseResponse } from '@extension/shared/types';
import { deleteMemo } from '@extension/shared/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseClient from './useSupabaseClient';

export default function useMemoDeleteMutation() {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient();

  return useMutation<MemoSupabaseResponse, Error, number>({
    mutationFn: (id: number) => deleteMemo(supabaseClient, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    },
  });
}
