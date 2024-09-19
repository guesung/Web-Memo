import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../constants';
import { getSession } from './getSession';
import { MemoType } from 'src/types';

export const getSupabaseClient = async () => {
  const user = await getSession();
  if (!user) throw new Error('없는 사용자입니다.');

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'memo' },
    global: {
      headers: {
        authorization: `Bearer ${user.access_token}`,
      },
    },
  });
  return supabaseClient;
};

export const getMemo = async () => {
  const supabaseClient = await getSupabaseClient();
  return await supabaseClient.from('memo').select('*');
};

interface MemoSupabaseRequest extends Omit<MemoType, 'date'> {}

export const insertMemo = async (memoRequest: MemoSupabaseRequest | MemoSupabaseRequest[]) => {
  const supabaseClient = await getSupabaseClient();
  return await supabaseClient.from('memo').insert(memoRequest).select();
};

export const updateMemo = async (memoRequest: MemoSupabaseRequest) => {
  const supabaseClient = await getSupabaseClient();
  return await supabaseClient.from('memo').update(memoRequest).eq('url', memoRequest).select();
};

export const upsertMemo = async (memoRequest: MemoSupabaseRequest | MemoSupabaseRequest[]) => {
  const supabaseClient = await getSupabaseClient();
  return await supabaseClient.from('memo').upsert(memoRequest).select();
};
