import { NoMemoError, NoMemosError, QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse, MemoTable } from '@src/types';
import { upsertMemos } from '@src/utils';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

type MutationVariables = {
  memoRequest: MemoTable['Insert'][];
};
type MutationData = Awaited<ReturnType<typeof upsertMemos>>;
type MutationError = Error;

interface UseMemosUpsertMutationProps extends UseMutationOptions<MutationData, MutationError, MutationVariables> {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemosUpsertMutation({ supabaseClient, ...useMutationProps }: UseMemosUpsertMutationProps) {
  const queryClient = useQueryClient();
  return useMutation<MutationData, MutationError, MutationVariables>({
    ...useMutationProps,
    mutationFn: async ({ memoRequest }) => await upsertMemos(supabaseClient, memoRequest),
    onMutate: async ({ memoRequest }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });
      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(QUERY_KEY.memos());

      if (!previousMemos) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      memoRequest.forEach(memo => {
        const currentMemoIndex = previousMemosData.findIndex(memo => memo.id === memo.id);
        const currentMemoBase = previousMemosData.find(memo => memo.id === memo.id);

        if (currentMemoIndex === -1 || !currentMemoBase) throw new NoMemoError();

        previousMemosData.splice(currentMemoIndex, 1, { ...currentMemoBase, ...memo });
      });

      await queryClient.setQueryData(QUERY_KEY.memos(), { ...previousMemos, data: previousMemosData });

      return { previousMemos };
    },
  });
}
