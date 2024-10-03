import { MemoSupabaseResponse } from '@extension/shared/types';
import { getMemoSupabase } from '@extension/shared/utils';
import { getSupabaseClient } from '@extension/shared/utils/extension';
import { useQuery } from '@tanstack/react-query';

export default function useMemoListQuery() {
  const getMemoList = async () => {
    const supabaseClient = await getSupabaseClient();
    return await getMemoSupabase(supabaseClient);
  };

  const query = useQuery<MemoSupabaseResponse>({
    queryFn: getMemoList,
    queryKey: ['memo-list'],
  });

  return query;
}
