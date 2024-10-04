import { formatUrl, insertMemo, updateMemo } from '@extension/shared/utils';
import { getFormattedMemo, getSupabaseClient } from '@extension/shared/utils/extension';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import useTabQuery from './useTabQuery';
import useMemoListQuery from './useMemoListQuery';
import { MemoSupabaseResponse } from '@extension/shared/types';

export default function useMemoMutation(useMutationProps: UseMutationOptions<MemoSupabaseResponse, Error, string>) {
  const queryClient = useQueryClient();
  const { data: memoList } = useMemoListQuery();
  const { data: tab } = useTabQuery();

  const saveMemo = async (memo: string) => {
    const currentMemo = memoList?.data?.find(memo => memo.url === formatUrl(tab?.url));
    const supabaseClient = await getSupabaseClient();

    if (currentMemo) return await updateMemo(supabaseClient, { ...currentMemo, memo });
    else {
      const formattedMemo = await getFormattedMemo(memo);
      return await insertMemo(supabaseClient, formattedMemo);
    }
  };

  return useMutation<MemoSupabaseResponse, Error, string>({
    mutationFn: saveMemo,
    onSettled: async () => {
      queryClient.invalidateQueries({ queryKey: ['memo-list'] });
    },
    ...useMutationProps,
  });
}
