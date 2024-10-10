import { queryKeys } from '@src/constants';
import { MemoSupabaseClient, MemoSupabaseResponse } from '@src/types';
import { formatUrl, insertMemo, updateMemo } from '@src/utils';
import { getSupabaseClient } from '@src/utils/extension';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import useMemoListQuery from './useMemoListQuery';

interface SaveMemoProps {
  memo: string;
  url: string;
  title: string;
  category: string;
}

interface UseMemoPostMutationProps extends UseMutationOptions<MemoSupabaseResponse, Error, SaveMemoProps> {
  supabaseClient: MemoSupabaseClient;
  handleSettled: () => void;
}

export default function useMemoPostMutation({
  supabaseClient,
  handleSettled,
  ...useMutationProps
}: UseMemoPostMutationProps) {
  const queryClient = useQueryClient();
  const { data: memoList } = useMemoListQuery({ supabaseClient });

  const saveMemo = async ({ memo, title, url, category }: SaveMemoProps) => {
    const currentMemo = memoList?.data?.find(memo => memo.url === formatUrl(url));
    const supabaseClient = await getSupabaseClient();

    console.log(memo, title, url, category);

    if (currentMemo) return await updateMemo(supabaseClient, { ...currentMemo, memo, category });
    else return await insertMemo(supabaseClient, { memo, title, url, category });
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
