'use server';
import { PATHS } from '@extension/shared/constants';
import { checkUserLogin } from '@extension/shared/utils';
import { LanguageParams } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';
import { redirect } from 'next/navigation';

import { LoginSection, PersonalInformationInfo } from './components';

export default async function page({ params: { lng } }: LanguageParams) {
  const supabaseClient = getSupabaseClient();
  const isUserLogin = await checkUserLogin(supabaseClient);

  if (isUserLogin) redirect(PATHS.memos);
  return (
    <main className="relative flex h-full items-center justify-center">
      <LoginSection lng={lng} />
      <PersonalInformationInfo lng={lng} />
    </main>
  );
}
