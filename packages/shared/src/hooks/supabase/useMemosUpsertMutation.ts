import { NoMemosError, QUERY_KEY } from '@src/constants';
import { MemoRow, MemoSupabaseResponse, MemoTable } from '@src/types';
import { MemoService } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

type MutationVariables = MemoTable['Insert'][];
type MutationData = Awaited<ReturnType<MemoService['upsertMemos']>>;
type MutationError = Error;

export default function useMemosUpsertMutation() {
  const queryClient = useQueryClient();
  const { data: supabaseClient } = useSupabaseQuery();

  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: new MemoService(supabaseClient).upsertMemos,
    onMutate: async memoRequest => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });
      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(QUERY_KEY.memos());

      if (!previousMemos) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      const updatedMemosData = [...previousMemosData];

      memoRequest.forEach(memo => {
        const currentMemoIndex = updatedMemosData.findIndex(previousMemo => previousMemo.id === memo.id);
        const currentMemoBase = updatedMemosData.find(previousMemo => previousMemo.id === memo.id);

        if (currentMemoIndex === -1 || !currentMemoBase) updatedMemosData.unshift(memo as MemoRow);
        else updatedMemosData.splice(currentMemoIndex, 1, { ...currentMemoBase, ...memo });
      });

      await queryClient.setQueryData(QUERY_KEY.memos(), { ...previousMemos, data: updatedMemosData });

      return { previousMemos };
    },
  });
}
