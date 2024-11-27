'use server';

import { QUERY_KEY } from '@extension/shared/constants';
import { getMemos } from '@extension/shared/utils';
import { HydrationBoundaryWrapper } from '@src/components';
import { LanguageParams } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';

import { MemoDialog, MemoView } from './components';

export default async function Page({ params: { lng } }: LanguageParams) {
  const supabaseClient = getSupabaseClient();

  return (
    <HydrationBoundaryWrapper queryKey={QUERY_KEY.memos()} queryFn={() => getMemos(supabaseClient)}>
      <MemoView lng={lng} />
      <MemoDialog lng={lng} />
    </HydrationBoundaryWrapper>
  );
}
