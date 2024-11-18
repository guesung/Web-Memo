import { NoMemosError, queryKeys } from '@src/constants';
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
      await queryClient.cancelQueries({ queryKey: queryKeys.memos() });

      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(queryKeys.memos());

      if (!previousMemos || !newData) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      const newMemosData = previousMemosData.concat(newData);

      await queryClient.setQueryData(queryKeys.memos(), { ...previousMemos, data: newMemosData });

      handleSuccess();

      return { previousMemos };
    },
  });
}
