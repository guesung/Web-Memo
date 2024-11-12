'use server';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { LoginSection, PersonalInformationInfo } from './components';
import { redirect } from 'next/navigation';

export default async function page() {
  const supabaseClient = getSupabaseClient();
  const user = await supabaseClient.auth.getUser();

  if (user?.data?.user) redirect('/memos');
  return (
    <main className="relative flex h-full items-center justify-center">
      <LoginSection />
      <PersonalInformationInfo />
    </main>
  );
}
