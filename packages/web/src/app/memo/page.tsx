import { getMemoSupabase } from '@extension/shared/utils';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { MemoList } from './components';
import { redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@extension/shared/constants';
import { HydrationBoundaryWrapper } from '@src/components';

export default async function Page() {
  const supabaseClient = await getSupabaseClient();
  const user = await supabaseClient.auth.getUser();

  if (!user?.data?.user) redirect('/login');
  return (
    <main>
      <div className="h-16" />
      <HydrationBoundaryWrapper queryKey={queryKeys.memoList()} queryFn={() => getMemoSupabase(supabaseClient)}>
        <MemoList />
      </HydrationBoundaryWrapper>
    </main>
  );
}
