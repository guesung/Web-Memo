import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@src/constants';
import { getSession } from './storage';
import { Database } from '@src/types';

const supabaseClientInstance: SupabaseClient<Database, 'memo', Database['memo']> | null = null;

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
