import { getMemoSupabase } from '@extension/shared/utils';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { MemoList } from './components';

export default async function Page() {
  const supabaseClient = await getSupabaseClient();
  const memoList = await getMemoSupabase(supabaseClient);

  return (
    <main>
      <div className="h-16" />
      <MemoList initialMemoList={memoList} />
    </main>
  );
}
