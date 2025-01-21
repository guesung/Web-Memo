import { NoMemoError, NoMemosError, QUERY_KEY } from '@src/constants';
import { MemoRow, MemoSupabaseResponse, MemoTable } from '@src/types';
import { MemoService } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseClientQuery from './useSupabaseClientQuery';

type MutationVariables = {
  id: MemoRow['id'];
  request: MemoTable['Update'];
};
type MutationData = Awaited<ReturnType<MemoService['updateMemo']>>;
type MutationError = Error;

export default function useMemoPatchMutation() {
  const queryClient = useQueryClient();
  const { data: supabaseClient } = useSupabaseClientQuery();

  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: new MemoService(supabaseClient).updateMemo,
    onMutate: async ({ id, request }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });
      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(QUERY_KEY.memos());

      if (!previousMemos) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      const updatedMemosData = [...previousMemosData];

      const currentMemoIndex = updatedMemosData.findIndex(memo => memo.id === id);
      const currentMemoBase = updatedMemosData.find(memo => memo.id === id);

      if (currentMemoIndex === -1 || !currentMemoBase) throw new NoMemoError();

      updatedMemosData.splice(currentMemoIndex, 1, {
        ...{ ...currentMemoBase, updated_at: new Date().toISOString() },
        ...request,
      });

      await queryClient.setQueryData(QUERY_KEY.memos(), { ...previousMemos, data: updatedMemosData });

      return { previousMemos };
    },
  });
}
