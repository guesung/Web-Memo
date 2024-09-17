import { createClient } from '@supabase/supabase-js';
import { getUserFromCookie } from './getUserFromCookie';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../lib/constants';

export const getSupabaseClient = async () => {
  const user = await getUserFromCookie();
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'memo' },
    global: {
      headers: {
        authorization: `Bearer ${user.access_token}`,
      },
    },
  });
  await supabase.auth.setSession({ accessToken: user.access_token, refresh_token: user.refresh_token });
  return supabase;
};

export const getAllMemo = async () => {
  const supabaseClient = await getSupabaseClient();
  const response = await supabaseClient.from('memo').select('*');
  return response;
};
