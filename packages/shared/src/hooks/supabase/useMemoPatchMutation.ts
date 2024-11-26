import { NoMemoError, NoMemosError, QUERY_KEY } from '@src/constants';
import { MemoRow, MemoSupabaseClient, MemoSupabaseResponse, MemoTable } from '@src/types';
import { updateMemo } from '@src/utils';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

type MutationVariables = {
  id: MemoRow['id'];
  memoRequest: MemoTable['Update'];
};
type MutationData = Awaited<ReturnType<typeof updateMemo>>;
type MutationError = Error;

interface UseMemoPatchMutationProps extends UseMutationOptions<MutationData, MutationError, MutationVariables> {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemoPatchMutation({ supabaseClient, ...useMutationProps }: UseMemoPatchMutationProps) {
  const queryClient = useQueryClient();
  return useMutation<MutationData, MutationError, MutationVariables>({
    ...useMutationProps,
    mutationFn: async ({ id, memoRequest }) => await updateMemo(supabaseClient, id, memoRequest),
    onMutate: async ({ id, memoRequest }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });
      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(QUERY_KEY.memos());

      if (!previousMemos) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      const currentMemoIndex = previousMemosData.findIndex(memo => memo.id === id);
      const currentMemoBase = previousMemosData.find(memo => memo.id === id);

      if (currentMemoIndex === -1 || !currentMemoBase) throw new NoMemoError();

      previousMemosData.splice(currentMemoIndex, 1, { ...currentMemoBase, ...memoRequest });

      await queryClient.setQueryData(QUERY_KEY.memos(), { ...previousMemos, data: previousMemosData });

      return { previousMemos };
    },
  });
}
