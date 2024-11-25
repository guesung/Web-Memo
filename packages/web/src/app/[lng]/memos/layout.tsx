'use server';

import { COOKIE_KEY_SIDE_BAR_STATE, QUERY_KEY } from '@extension/shared/constants';
import { checkUserLogin, getCategory, getSupabaseClient } from '@extension/shared/utils';
import { LanguageParams } from '@src/app/i18n/type';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { SidebarProvider } from '@src/components/ui/sidebar';
import { PATHS } from '@src/constants';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PropsWithChildren } from 'react';
import { MemoSidebar, MemoSidebarTrigger } from './components';

interface LayoutProps extends LanguageParams, PropsWithChildren {}

export default async function Layout({ children, params: { lng } }: LayoutProps) {
  const supabaseClient = await getSupabaseClient();
  const isUserLogin = await checkUserLogin(supabaseClient);
  if (!isUserLogin) redirect(PATHS.login);

  const cookieStore = cookies();
  const defaultOpen = cookieStore.get(COOKIE_KEY_SIDE_BAR_STATE)?.value === 'true';

  return (
    <div>
      <Header.Margin />
      <div className="bg-background flex w-full p-4 text-sm">
        <SidebarProvider defaultOpen={defaultOpen}>
          <HydrationBoundaryWrapper queryKey={QUERY_KEY.category()} queryFn={() => getCategory(supabaseClient)}>
            <MemoSidebar lng={lng} />
            <MemoSidebarTrigger lng={lng} />
          </HydrationBoundaryWrapper>
          {children}
        </SidebarProvider>
      </div>
    </div>
  );
}
