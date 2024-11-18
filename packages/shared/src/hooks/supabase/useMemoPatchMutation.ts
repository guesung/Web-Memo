import { queryKeys, NoMemoError, NoMemosError } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@src/types';
import { updateMemo, UpdateMemoProps } from '@src/utils';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

interface UseMemoPostMutationProps extends UseMutationOptions<MemoSupabaseResponse, Error, UpdateMemoProps> {
  supabaseClient: MemoSupabaseClient;
  handleSuccess?: () => void;
}

export default function useMemoPatchMutation({
  supabaseClient,
  handleSuccess,
  ...useMutationProps
}: UseMemoPostMutationProps) {
  const queryClient = useQueryClient();
  return useMutation<MemoSupabaseResponse, Error, UpdateMemoProps>({
    ...useMutationProps,
    mutationFn: async (updateMemoProps: UpdateMemoProps) => await updateMemo(supabaseClient, updateMemoProps),
    onMutate: async currentMemo => {
      await queryClient.cancelQueries({ queryKey: queryKeys.memos() });
      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(queryKeys.memos());

      if (!previousMemos) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      const currentMemoIndex = previousMemosData.findIndex(memo => memo.id === currentMemo.id);
      const currentMemoBase = previousMemosData.find(memo => memo.id === currentMemo.id);

      if (currentMemoIndex === -1 || !currentMemoBase) throw new NoMemoError();

      previousMemosData.splice(currentMemoIndex, 1, { ...currentMemoBase, ...currentMemo });

      await queryClient.setQueryData(queryKeys.memos(), { ...previousMemos, data: previousMemosData });

      return { previousMemos };
    },
    onSuccess: async () => {
      handleSuccess?.();
    },
  });
}
