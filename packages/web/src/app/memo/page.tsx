import { getSupabaseClient } from '@extension/shared/utils/web';
import { Memo, MemoList } from './components';
import { getMemoSupabase } from '@extension/shared/utils';

export default async function Page() {
  const supabaseClient = getSupabaseClient();
  const memoList = await getMemoSupabase(supabaseClient);
  console.log(memoList);

  return <MemoList />;
  return <Memo />;
}
