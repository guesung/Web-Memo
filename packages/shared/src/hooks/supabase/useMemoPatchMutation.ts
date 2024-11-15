import { queryKeys, NoMemoError, NoMemoListError } from '@src/constants';
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
      await queryClient.cancelQueries({ queryKey: queryKeys.memoList() });
      const previousMemoList = queryClient.getQueryData<MemoSupabaseResponse>(queryKeys.memoList());

      if (!previousMemoList) throw new NoMemoListError();

      const { data: previousMemoListData } = previousMemoList;

      if (!previousMemoListData) throw new NoMemoListError();

      const currentMemoIndex = previousMemoListData.findIndex(memo => memo.id === currentMemo.id);
      const currentMemoBase = previousMemoListData.find(memo => memo.id === currentMemo.id);

      if (currentMemoIndex === -1 || !currentMemoBase) throw new NoMemoError();

      previousMemoListData.splice(currentMemoIndex, 1, { ...currentMemoBase, ...currentMemo });

      await queryClient.setQueryData(queryKeys.memoList(), { ...previousMemoList, data: previousMemoListData });

      return { previousMemoList };
    },
    onSuccess: async () => {
      handleSuccess?.();
    },
  });
}
