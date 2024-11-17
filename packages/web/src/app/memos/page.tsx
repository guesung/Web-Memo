import { queryKeys } from '@extension/shared/constants';
import { getMemo } from '@extension/shared/utils';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { MemoGrid, MemoMenu } from './components';
import { SidebarProvider, SidebarTrigger } from '@src/components/ui/sidebar';
import { cookies } from 'next/headers';
import { AppSidebar } from '@src/components/ui/app-sidebar';

export default async function Page() {
  const supabaseClient = getSupabaseClient();
  const cookieStore = cookies();
  const defaultOpen = cookieStore.get('sidebar:state')?.value === 'true';

  return (
    <>
      <Header />
      <Header.Margin />
      <main className="bg-background flex w-full p-4">
        <HydrationBoundaryWrapper queryKey={queryKeys.memoList()} queryFn={() => getMemo(supabaseClient)}>
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarTrigger />
            <MemoGrid />
          </SidebarProvider>
        </HydrationBoundaryWrapper>
      </main>
    </>
  );
}
