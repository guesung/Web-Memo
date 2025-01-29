'use server';

import { PATHS, QUERY_KEY } from '@extension/shared/constants';
import { AuthService, CategoryService } from '@extension/shared/utils';
import { HydrationBoundaryWrapper } from '@src/components';
import { Loading, SidebarProvider } from '@src/components/ui';
import type { LanguageParams } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';
import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { Suspense } from 'react';

import { InitSentryUserInfo, MemoSidebar } from './_components';
import { initSentryUserInfo } from './_utils';

interface LayoutProps extends LanguageParams, PropsWithChildren {}

export default async function Layout({ children, params: { lng } }: LayoutProps) {
  const supabaseClient = getSupabaseClient();
  const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();
  if (!isUserLogin) redirect(PATHS.login);

  await initSentryUserInfo({ lng });

  return (
    <SidebarProvider className="bg-background flex w-full text-sm">
      <HydrationBoundaryWrapper
        queryKey={QUERY_KEY.category()}
        queryFn={() => new CategoryService(supabaseClient).getCategories()}>
        <Suspense fallback={<Loading />}>
          <MemoSidebar lng={lng} />
        </Suspense>
      </HydrationBoundaryWrapper>
      {children}

      <Suspense>
        <InitSentryUserInfo lng={lng} />
      </Suspense>
    </SidebarProvider>
  );
}
