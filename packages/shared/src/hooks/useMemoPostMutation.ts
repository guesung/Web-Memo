import { queryKeys } from '@src/constants';
import { MemoSupabaseResponse } from '@src/types';
import { formatUrl, insertMemo, updateMemo } from '@src/utils';
import { getSupabaseClient } from '@src/utils/extension';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import useMemoListQuery from './useMemoListQuery';

interface SaveMemoProps {
  memo: string;
  url: string;
  title: string;
}

interface UseMemoPostMutationProps extends UseMutationOptions<MemoSupabaseResponse, Error, SaveMemoProps> {
  handleSettled: () => void;
}

export default function useMemoPostMutation({ handleSettled, ...useMutationProps }: UseMemoPostMutationProps) {
  const queryClient = useQueryClient();
  const { data: memoList } = useMemoListQuery();

  const saveMemo = async ({ memo, title, url }: SaveMemoProps) => {
    const currentMemo = memoList?.data?.find(memo => memo.url === formatUrl(url));
    const supabaseClient = await getSupabaseClient();

    if (currentMemo) return await updateMemo(supabaseClient, { ...currentMemo, memo });
    else return await insertMemo(supabaseClient, { memo, title, url });
  };

  return useMutation<MemoSupabaseResponse, Error, SaveMemoProps>({
    ...useMutationProps,
    mutationFn: saveMemo,
    onSettled: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memoList() });
      handleSettled();
    },
  });
}
