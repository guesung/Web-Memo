'use server';

import { QUERY_KEY } from '@extension/shared/constants';
import { SearchParamViewType } from '@extension/shared/modules/search-params';
import { getMemos } from '@extension/shared/utils';
import { HydrationBoundaryWrapper } from '@src/components';
import { LanguageParams } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';

import { MemoDialog, MemoView } from './components';

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
    <HydrationBoundaryWrapper queryKey={QUERY_KEY.memos()} queryFn={() => getMemos(supabaseClient)}>
      <MemoView lng={lng} isWish={searchParams.isWish} category={searchParams.category} view={searchParams.view} />
      {searchParams?.id && <MemoDialog lng={lng} id={searchParams.id} />}
    </HydrationBoundaryWrapper>
  );
}
