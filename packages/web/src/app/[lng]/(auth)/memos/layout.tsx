'use server';

import { PATHS, QUERY_KEY } from '@extension/shared/constants';
import { AuthService, CategoryService } from '@extension/shared/utils';
import { HydrationBoundaryWrapper } from '@src/components';
import { Loading, SidebarProvider } from '@src/components/ui';
import { LanguageParams } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';
import { redirect } from 'next/navigation';
import { PropsWithChildren, Suspense } from 'react';

import { MemoSidebar } from './_components';

interface LayoutProps extends LanguageParams, PropsWithChildren {}

export default async function Layout({ children, params: { lng } }: LayoutProps) {
  const supabaseClient = getSupabaseClient();
  const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();
  if (!isUserLogin) redirect(PATHS.login);

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

      {/* <ExtensionDialog lng={lng} /> */}
    </SidebarProvider>
  );
}
