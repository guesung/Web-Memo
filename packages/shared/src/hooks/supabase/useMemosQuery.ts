import { QUERY_KEY } from '@src/constants';
import { MemoService } from '@src/utils';
import { getSupabaseClient } from '@src/utils/web';
import { useSuspenseQuery } from '@tanstack/react-query';

type QueryData = Awaited<ReturnType<MemoService['getMemos']>>;
type QueryError = Error;

export default function useMemosQuery() {
  // const { data: supabaseClient } = useSupabaseQuery();
  const supabaseClient = getSupabaseClient();

  const query = useSuspenseQuery<QueryData, QueryError>({
    queryFn: async () => {
      const supabase = new MemoService(supabaseClient);

      return supabase.getMemos();
    },
    queryKey: QUERY_KEY.memos(),
  });

  return {
    ...query,
    memos: query.data?.data ?? [],
  };
}
