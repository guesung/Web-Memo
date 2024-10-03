'use server';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { getUser } from '@extension/shared/utils';
import LoginSection from './LoginSection';

export default async function page() {
  const supabaseClient = getSupabaseClient();
  const a = await getUser(supabaseClient);

  // if (user) redirect('/');
  return (
    <main className="bg-base-100 flex flex-col items-center justify-center h-full">
      <LoginSection />
    </main>
  );
}
