import { NoMemoError, NoMemosError, queryKeys } from '@src/constants';
import { MemoRow, MemoSupabaseClient, MemoSupabaseResponse, MemoTable } from '@src/types';
import { updateMemo } from '@src/utils';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

interface Variables {
  id: MemoRow['id'];
  memoRequest: MemoTable['Update'];
}

interface UseMemoPostMutationProps extends UseMutationOptions<MemoSupabaseResponse, Error, Variables> {
  supabaseClient: MemoSupabaseClient;
  handleSuccess?: () => void;
}

export default function useMemoPatchMutation({
  supabaseClient,
  handleSuccess,
  ...useMutationProps
}: UseMemoPostMutationProps) {
  const queryClient = useQueryClient();
  return useMutation<MemoSupabaseResponse, Error, Variables>({
    ...useMutationProps,
    mutationFn: async ({ id, memoRequest }) => await updateMemo(supabaseClient, id, memoRequest),
    onMutate: async ({ id, memoRequest }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.memos() });
      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(queryKeys.memos());

      if (!previousMemos) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      const currentMemoIndex = previousMemosData.findIndex(memo => memo.id === id);
      const currentMemoBase = previousMemosData.find(memo => memo.id === id);

      if (currentMemoIndex === -1 || !currentMemoBase) throw new NoMemoError();

      previousMemosData.splice(currentMemoIndex, 1, { ...currentMemoBase, ...memoRequest });

      await queryClient.setQueryData(queryKeys.memos(), { ...previousMemos, data: previousMemosData });

      return { previousMemos };
    },
    onSuccess: async () => {
      handleSuccess?.();
    },
  });
}
