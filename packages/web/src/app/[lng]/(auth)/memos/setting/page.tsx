'use server';

import { QUERY_KEY } from '@extension/shared/constants';
import { CategoryService } from '@extension/shared/utils';
import { HydrationBoundaryWrapper } from '@src/components';
import { HeaderMargin } from '@src/components/Header';
import type { LanguageParams } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';

import { Setting, SettingHeader } from './_components';

export default async function Page({ params: { lng } }: LanguageParams) {
  const supabaseClient = getSupabaseClient();

  return (
    <main>
      <HeaderMargin />
      <SettingHeader lng={lng} />
      <HydrationBoundaryWrapper
        queryKey={QUERY_KEY.category()}
        queryFn={new CategoryService(supabaseClient).getCategories}>
        <Setting lng={lng} />
      </HydrationBoundaryWrapper>
    </main>
  );
}
