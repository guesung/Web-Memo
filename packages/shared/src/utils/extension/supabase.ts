import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSession } from './getSession';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClientInstance: SupabaseClient<any, 'memo', any> | null = null;

export const getSupabaseClient = async () => {
  if (supabaseClientInstance) return supabaseClientInstance;

  const user = await getSession();
  if (!user) throw new Error('없는 사용자입니다.');

  supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'memo' },
    global: {
      headers: {
        authorization: `Bearer ${user.access_token}`,
      },
    },
  });
  return supabaseClientInstance;
};

export const getMemoSupabase = async () => {
  const supabaseClient = await getSupabaseClient();
  const response = await supabaseClient.from('memo').select('*');
  return response;
};

export const insertMemoSupabase = async (memo: string) => {
  const supabaseClient = await getSupabaseClient();
  await supabaseClient.from('memo').insert({ memo });
};
