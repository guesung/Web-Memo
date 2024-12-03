import { QUERY_KEY } from '@extension/shared/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@extension/shared/types';
import { deleteMemos } from '@extension/shared/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseDeleteMemosMutationProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useDeleteMemosMutation({ supabaseClient }: UseDeleteMemosMutationProps) {
  const queryClient = useQueryClient();

  return useMutation<MemoSupabaseResponse, Error, number[]>({
    mutationFn: (idList: number[]) => deleteMemos(supabaseClient, idList),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    },
  });
}
