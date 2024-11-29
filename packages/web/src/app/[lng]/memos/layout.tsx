'use server';

import { COOKIE_KEY, PATHS, QUERY_KEY } from '@extension/shared/constants';
import { checkUserLogin, getCategories } from '@extension/shared/utils';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { SidebarProvider } from '@src/components/ui/sidebar';
import { LanguageParams } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PropsWithChildren } from 'react';

import { MemoSidebar } from './components';

interface LayoutProps extends LanguageParams, PropsWithChildren {}

export default async function Layout({ children, params: { lng } }: LayoutProps) {
  const supabaseClient = getSupabaseClient();
  const isUserLogin = await checkUserLogin(supabaseClient);
  if (!isUserLogin) redirect(PATHS.login);

  const cookieStore = cookies();
  const defaultOpen = cookieStore.get(COOKIE_KEY.sideBarState)?.value === 'true';

  return (
    <div>
      <Header.Margin />
      <div className="bg-background flex w-full p-4 text-sm">
        <SidebarProvider defaultOpen={defaultOpen}>
          <HydrationBoundaryWrapper queryKey={QUERY_KEY.category()} queryFn={() => getCategories(supabaseClient)}>
            <MemoSidebar lng={lng} />
          </HydrationBoundaryWrapper>
          {children}
        </SidebarProvider>
      </div>
    </div>
  );
}
