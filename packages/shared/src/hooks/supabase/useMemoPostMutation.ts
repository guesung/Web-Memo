import { NoMemosError, queryKeys } from '@src/constants';
import type { MemoSupabaseClient, MemoSupabaseResponse, MemoTable } from '@src/types';
import { insertMemo } from '@src/utils';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

interface UseMemoPostMutationProps extends UseMutationOptions<MemoSupabaseResponse, Error, MemoTable['Insert']> {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemoPostMutation({ supabaseClient, ...useMutationProps }: UseMemoPostMutationProps) {
  const queryClient = useQueryClient();
  return useMutation<MemoSupabaseResponse, Error, MemoTable['Insert']>({
    ...useMutationProps,
    mutationFn: async postMemoProps => await insertMemo(supabaseClient, postMemoProps),
    onSuccess: async (result, variables, context) => {
      const { data: newData } = result;

      await queryClient.cancelQueries({ queryKey: queryKeys.memos() });

      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(queryKeys.memos());

      if (!previousMemos || !newData) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      const newMemosData = previousMemosData.concat(newData);

      await queryClient.setQueryData(queryKeys.memos(), { ...previousMemos, data: newMemosData });

      useMutationProps.onSuccess?.(result, variables, context);

      return { previousMemos };
    },
  });
}
