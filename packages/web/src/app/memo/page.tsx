import { getMemoSupabase } from '@extension/shared/utils';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { MemoList } from './components';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabaseClient = await getSupabaseClient();
  const user = await supabaseClient.auth.getUser();
  const memoList = await getMemoSupabase(supabaseClient);

  if (!user?.data?.user) redirect('/login');
  return (
    <main>
      <div className="h-16" />
      <MemoList initialMemoList={memoList} />
    </main>
  );
}
