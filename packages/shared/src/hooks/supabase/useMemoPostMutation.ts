import { NoMemoListError, queryKeys } from '@src/constants';
import type { MemoSupabaseClient, MemoSupabaseResponse, MemoTableInsert } from '@src/types';
import { insertMemo } from '@src/utils';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

interface PostMemoProps extends MemoTableInsert {}

interface UseMemoPostMutationProps extends UseMutationOptions<MemoSupabaseResponse, Error, PostMemoProps> {
  supabaseClient: MemoSupabaseClient;
  handleSuccess: () => void;
}

export default function useMemoPostMutation({
  supabaseClient,
  handleSuccess,
  ...useMutationProps
}: UseMemoPostMutationProps) {
  const queryClient = useQueryClient();
  return useMutation<MemoSupabaseResponse, Error, PostMemoProps>({
    ...useMutationProps,
    mutationFn: async (postMemoProps: PostMemoProps) => await insertMemo(supabaseClient, postMemoProps),
    onSuccess: async ({ data: newData }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.memoList() });

      const previousMemoList = queryClient.getQueryData<MemoSupabaseResponse>(queryKeys.memoList());

      if (!previousMemoList || !newData) throw new NoMemoListError();

      const { data: previousMemoListData } = previousMemoList;

      if (!previousMemoListData) throw new NoMemoListError();

      const newMemoListData = previousMemoListData.concat(newData);

      await queryClient.setQueryData(queryKeys.memoList(), { ...previousMemoList, data: newMemoListData });

      handleSuccess();

      return { previousMemoList };
    },
  });
}
