'use server';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { LoginSection, PersonalInformationInfo } from './components';
import { redirect } from 'next/navigation';
import { LangageParams } from '@src/app/i18n/type';

export default async function page({ params: { lng } }: LangageParams) {
  const supabaseClient = getSupabaseClient();
  const user = await supabaseClient.auth.getUser();
  const isUserLogin = !!user?.data?.user;

  if (isUserLogin) redirect('/memos');
  return (
    <main className="relative flex h-full items-center justify-center">
      <LoginSection lng={lng} />
      <PersonalInformationInfo lng={lng} />
    </main>
  );
}
