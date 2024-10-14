import { queryKeys } from '@extension/shared/constants';
import { getMemoSupabase } from '@extension/shared/utils';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { redirect } from 'next/navigation';
import { MemoView } from './components';

export default async function Page() {
  const supabaseClient = getSupabaseClient();
  const user = await supabaseClient.auth.getUser();

  if (!user?.data?.user) redirect('/login');
  return (
    <>
      <Header />
      <Header.Margin />
      <main className="flex items-center flex-col">
        <HydrationBoundaryWrapper queryKey={queryKeys.memoList()} queryFn={() => getMemoSupabase(supabaseClient)}>
          <MemoView />
        </HydrationBoundaryWrapper>
      </main>
    </>
  );
}
