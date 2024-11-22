import { QUERY_KEY } from '@extension/shared/constants';
import { getMemo } from '@extension/shared/utils';
import { LanguageParams } from '@src/app/i18n/type';
import { HydrationBoundaryWrapper } from '@src/components';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { MemoDialog, MemoView } from './components';

export default async function Page({ params: { lng } }: LanguageParams) {
  const supabaseClient = getSupabaseClient();

  return (
    <HydrationBoundaryWrapper queryKey={QUERY_KEY.memos()} queryFn={() => getMemo(supabaseClient)}>
      <MemoView lng={lng} />
      <MemoDialog lng={lng} />
    </HydrationBoundaryWrapper>
  );
}
