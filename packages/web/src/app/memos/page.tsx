import { queryKeys } from '@extension/shared/constants';
import { getMemo } from '@extension/shared/utils';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { MemoGrid, MemoMenu } from './components';

export default async function Page() {
  const supabaseClient = getSupabaseClient();

  return (
    <>
      <Header />
      <Header.Margin />
      <main className="bg-background flex w-full p-4">
        <MemoMenu />
        <MemoMenu.Margin />
        <HydrationBoundaryWrapper queryKey={queryKeys.memoList()} queryFn={() => getMemo(supabaseClient)}>
          <MemoGrid />
        </HydrationBoundaryWrapper>
      </main>
    </>
  );
}
