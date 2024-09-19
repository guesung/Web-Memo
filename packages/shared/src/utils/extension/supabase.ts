import { createClient } from '@supabase/supabase-js';
import { Database } from 'src/types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../constants';
import { getSession } from './getSession';

export const getSupabaseClient = async () => {
  const user = await getSession();
  if (!user) throw new Error('없는 사용자입니다.');

  const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

export const insertMemo = async (memoRequest: Database['memo']['Tables']['memo']['Insert']) => {
  const supabaseClient = await getSupabaseClient();
  return await supabaseClient.from('memo').insert(memoRequest).select();
};

export const updateMemo = async (memoRequest: Database['memo']['Tables']['memo']['Update']) => {
  const supabaseClient = await getSupabaseClient();
  return await supabaseClient.from('memo').update(memoRequest).eq('url', memoRequest).select();
};

export const upsertMemo = async (memoRequest: Database['memo']['Tables']['memo']['Insert']) => {
  const supabaseClient = await getSupabaseClient();
  return await supabaseClient.from('memo').upsert(memoRequest).select();
};
