import { NoMemoError, NoMemosError, QUERY_KEY } from '@src/constants';
import { MemoRow, MemoSupabaseResponse, MemoTable } from '@src/types';
import { MemoService } from '@src/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

type MutationVariables = {
  id: MemoRow['id'];
  memoRequest: MemoTable['Update'];
};
type MutationData = Awaited<ReturnType<MemoService['updateMemo']>>;
type MutationError = Error;

export default function useMemoPatchMutation() {
  const queryClient = useQueryClient();
  const { data: supabaseClient } = useSupabaseQuery();

  return useMutation<MutationData, MutationError, MutationVariables>({
    mutationFn: async ({ id, memoRequest }) => await new MemoService(supabaseClient).updateMemo(id, memoRequest),
    onMutate: async ({ id, memoRequest }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });
      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(QUERY_KEY.memos());

      if (!previousMemos) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      const updatedMemosData = [...previousMemosData];

      const currentMemoIndex = updatedMemosData.findIndex(memo => memo.id === id);
      const currentMemoBase = updatedMemosData.find(memo => memo.id === id);

      if (currentMemoIndex === -1 || !currentMemoBase) throw new NoMemoError();

      updatedMemosData.splice(currentMemoIndex, 1, { ...currentMemoBase, ...memoRequest });

      await queryClient.setQueryData(QUERY_KEY.memos(), { ...previousMemos, data: updatedMemosData });

      return { previousMemos };
    },
  });
}
