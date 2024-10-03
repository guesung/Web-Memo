import { getSupabaseClient } from '@src/utils/supabase.server';
import { Memo, MemoList } from './components';
import { getMemoSupabase } from '@extension/shared/utils';

export default async function Page() {
  const supabaseClient = await getSupabaseClient();
  const memoList = await getMemoSupabase(supabaseClient);

  console.log(memoList);

  return <MemoList initialMemoList={memoList} />;
}
