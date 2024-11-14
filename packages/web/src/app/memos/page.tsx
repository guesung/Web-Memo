import { queryKeys } from '@extension/shared/constants';
import { getMemoSupabase } from '@extension/shared/utils';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { MemoView } from './components';

export default async function Page() {
  const supabaseClient = getSupabaseClient();

  return (
    <>
      <Header />
      <Header.Margin />
      <main className="flex flex-col items-center">
        <HydrationBoundaryWrapper queryKey={queryKeys.memoList()} queryFn={() => getMemoSupabase(supabaseClient)}>
          <MemoView />
        </HydrationBoundaryWrapper>
      </main>
    </>
  );
}
