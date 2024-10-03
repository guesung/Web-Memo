import { formatUrl, insertMemo, updateMemo } from '@extension/shared/utils';
import { getFormattedMemo, getSupabaseClient } from '@extension/shared/utils/extension';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useTabQuery from './useTabQuery';
import useMemoListQuery from './useMemoListQuery';

export default function useMemoMutation() {
  const queryClient = useQueryClient();
  const { data: memoList } = useMemoListQuery();
  const { data: tab } = useTabQuery();

  const saveMemo = async (memo: string) => {
    const currentMemo = memoList?.data?.find(memo => memo.url === formatUrl(tab?.url));
    const supabaseClient = await getSupabaseClient();

    if (currentMemo) await updateMemo(supabaseClient, { ...currentMemo, memo });
    else {
      const formattedMemo = await getFormattedMemo(memo);
      await insertMemo(supabaseClient, formattedMemo);
    }
  };

  return useMutation({
    mutationFn: saveMemo,
    onSettled: async () => {
      queryClient.invalidateQueries({ queryKey: ['memo-list'] });
    },
  });
}
