import { queryKeys } from '@extension/shared/constants';
import { getMemoSupabase } from '@extension/shared/utils';
import { HydrationBoundaryWrapper } from '@src/components';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { redirect } from 'next/navigation';
import { MemoList } from './components';

export default async function Page() {
  const supabaseClient = getSupabaseClient();
  const user = await supabaseClient.auth.getUser();

  if (!user?.data?.user) redirect('/login');
  return (
    <main>
      <HydrationBoundaryWrapper queryKey={queryKeys.memoList()} queryFn={() => getMemoSupabase(supabaseClient)}>
        <MemoList />
      </HydrationBoundaryWrapper>
    </main>
  );
}
