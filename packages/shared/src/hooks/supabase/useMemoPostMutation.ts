import { NoMemosError, QUERY_KEY } from '@src/constants';
import type { MemoSupabaseClient, MemoSupabaseResponse, MemoTable } from '@src/types';
import { insertMemo } from '@src/utils';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

type MutationData = Awaited<ReturnType<typeof insertMemo>>;
type MutationError = Error;

interface UseMemoPostMutationProps extends UseMutationOptions<MutationData, MutationError, MemoTable['Insert']> {
  supabaseClient: MemoSupabaseClient;
}

export default function useMemoPostMutation({ supabaseClient, ...useMutationProps }: UseMemoPostMutationProps) {
  const queryClient = useQueryClient();
  return useMutation<MemoSupabaseResponse, Error, MemoTable['Insert']>({
    ...useMutationProps,
    mutationFn: async postMemoProps => await insertMemo(supabaseClient, postMemoProps),
    onSuccess: async (result, variables, context) => {
      const { data: newData } = result;

      await queryClient.cancelQueries({ queryKey: QUERY_KEY.memos() });

      const previousMemos = queryClient.getQueryData<MemoSupabaseResponse>(QUERY_KEY.memos());

      if (!previousMemos || !newData) throw new NoMemosError();

      const { data: previousMemosData } = previousMemos;

      if (!previousMemosData) throw new NoMemosError();

      const newMemosData = newData.concat(previousMemosData);

      await queryClient.setQueryData(QUERY_KEY.memos(), { ...previousMemos, data: newMemosData });

      useMutationProps.onSuccess?.(result, variables, context);

      return { previousMemos };
    },
  });
}
