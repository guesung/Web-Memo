import { queryKeys } from '@extension/shared/constants';
import { getCategory, getMemo } from '@extension/shared/utils';
import { HydrationBoundaryWrapper } from '@src/components';
import { SidebarProvider, SidebarTrigger } from '@src/components/ui/sidebar';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { cookies } from 'next/headers';
import { Header, MemoDialog, MemoGrid, MemoSidebar } from './components';

export default async function Page() {
  const supabaseClient = getSupabaseClient();
  const cookieStore = cookies();
  const defaultOpen = cookieStore.get('sidebar:state')?.value === 'true';

  return (
    <>
      <Header />
      <Header.Margin />
      <main className="bg-background flex w-full p-4 text-sm">
        <SidebarProvider defaultOpen={defaultOpen}>
          <HydrationBoundaryWrapper queryKey={queryKeys.category()} queryFn={() => getCategory(supabaseClient)}>
            <SidebarTrigger />
            <MemoSidebar />
          </HydrationBoundaryWrapper>
          <HydrationBoundaryWrapper queryKey={queryKeys.memoList()} queryFn={() => getMemo(supabaseClient)}>
            <MemoGrid />
            <MemoDialog />
          </HydrationBoundaryWrapper>
        </SidebarProvider>
      </main>
    </>
  );
}
