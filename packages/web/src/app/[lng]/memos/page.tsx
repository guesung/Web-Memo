import { COOKIE_KEY_SIDE_BAR_STATE, QUERY_KEY } from '@extension/shared/constants';
import { getCategory, getMemo } from '@extension/shared/utils';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { SidebarProvider } from '@src/components/ui/sidebar';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { cookies } from 'next/headers';
import { MemoDialog, MemoSidebar, MemoSidebarTrigger, MemoView } from './components';

export default function Page() {
  const supabaseClient = getSupabaseClient();
  const cookieStore = cookies();
  const defaultOpen = cookieStore.get(COOKIE_KEY_SIDE_BAR_STATE)?.value === 'true';

  return (
    <>
      <Header.Margin />
      <main className="bg-background flex w-full p-4 text-sm">
        <SidebarProvider defaultOpen={defaultOpen}>
          <HydrationBoundaryWrapper queryKey={QUERY_KEY.category()} queryFn={() => getCategory(supabaseClient)}>
            <MemoSidebar />
            <MemoSidebarTrigger />
          </HydrationBoundaryWrapper>
          <HydrationBoundaryWrapper queryKey={QUERY_KEY.memos()} queryFn={() => getMemo(supabaseClient)}>
            <MemoView />
            <MemoDialog />
          </HydrationBoundaryWrapper>
        </SidebarProvider>
      </main>
    </>
  );
}
