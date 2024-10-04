import { queryKeys } from '@src/constants';
import { MemoSupabaseResponse } from '@src/types';
import { getMemoSupabase } from '@src/utils';
import { getSupabaseClient } from '@src/utils/extension';
import { useQuery } from '@tanstack/react-query';

export default function useMemoListQuery() {
  const getMemoList = async () => {
    const supabaseClient = await getSupabaseClient();
    return await getMemoSupabase(supabaseClient);
  };

  return useQuery<MemoSupabaseResponse, Error>({
    queryFn: getMemoList,
    queryKey: queryKeys.memoList(),
  });
}
