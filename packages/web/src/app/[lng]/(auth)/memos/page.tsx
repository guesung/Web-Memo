'use server';

import { QUERY_KEY } from '@extension/shared/constants';
import { SearchParamViewType } from '@extension/shared/modules/search-params';
import { MemoService } from '@extension/shared/utils';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { Loading } from '@src/components/ui';
import { LanguageParams } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';
import { Suspense } from 'react';

import { MemoDialog, MemoView, SearchForm, SearchFormProvider } from './components';

interface PageProps extends LanguageParams {
  searchParams: {
    id?: string;
    isWish?: string;
    category?: string;
    view?: SearchParamViewType;
  };
}

export default async function Page({ searchParams, params: { lng } }: PageProps) {
  const supabaseClient = getSupabaseClient();

  return (
    <main className="w-full px-4">
      <Header.Margin />
      <HydrationBoundaryWrapper queryKey={QUERY_KEY.memos()} queryFn={() => new MemoService(supabaseClient).getMemos()}>
        <Suspense fallback={<Loading />}>
          <SearchFormProvider>
            <SearchForm lng={lng} />
            <MemoView
              lng={lng}
              isWish={searchParams.isWish}
              category={searchParams.category}
              view={searchParams.view}
            />
          </SearchFormProvider>
          {searchParams?.id && <MemoDialog lng={lng} id={searchParams.id} />}
        </Suspense>
      </HydrationBoundaryWrapper>
    </main>
  );
}
