import { queryKeys } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@src/types';
import { insertMemo } from '@src/utils';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

interface PostMemoProps {
  memo: string;
  url: string;
  title: string;
  category: string;
}

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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memoList() });
      handleSuccess();
    },
  });
}
