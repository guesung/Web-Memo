import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@src/constants';
import { getSession } from './storage';
import { Database } from '@src/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseClientInstance: SupabaseClient<any, 'memo', any> | null = null;

export const getSupabaseClient = async () => {
  if (supabaseClientInstance) return supabaseClientInstance;

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

export const getMemoSupabase = async () => {
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
