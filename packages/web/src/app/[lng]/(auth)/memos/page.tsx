'use server';

import { QUERY_KEY } from '@extension/shared/constants';
import { SearchParamsType } from '@extension/shared/modules/search-params';
import { MemoService } from '@extension/shared/utils';
import { HydrationBoundaryWrapper } from '@src/components';
import { Loading } from '@src/components/ui';
import { LanguageParams } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';
import { Suspense } from 'react';

import { MemoDialog, MemoView, SearchForm, SearchFormProvider } from './_components';
import { HeaderMargin } from './_components/Header';

interface PageProps extends LanguageParams {
  searchParams: SearchParamsType;
}

export default async function Page({ searchParams, params: { lng } }: PageProps) {
  const supabaseClient = getSupabaseClient();

  return (
    <main className="w-full px-4">
      <HeaderMargin />
      <HydrationBoundaryWrapper queryKey={QUERY_KEY.memos()} queryFn={() => new MemoService(supabaseClient).getMemos()}>
        <Suspense fallback={<Loading />}>
          <SearchFormProvider>
            <SearchForm lng={lng} />
            <MemoView lng={lng} searchParams={searchParams} />
          </SearchFormProvider>
          {searchParams?.id && <MemoDialog lng={lng} searchParams={searchParams} />}
        </Suspense>
      </HydrationBoundaryWrapper>
    </main>
  );
}
