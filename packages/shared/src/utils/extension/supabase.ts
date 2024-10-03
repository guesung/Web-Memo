import { SUPABASE_ANON_KEY, SUPABASE_URL, WEB_URL } from '@src/constants';
import { Database, MemoSupabaseClient } from '@src/types';
import { createClient } from '@supabase/supabase-js';

let supabaseClientInstance: MemoSupabaseClient | null = null;

export const getToken = async () => {
  const accessTokenCookie = await chrome.cookies.get({
    name: 'access_token',
    url: WEB_URL,
  });
  const refreshTokenCookie = await chrome.cookies.get({
    name: 'refresh_token',
    url: WEB_URL,
  });

  if (!accessTokenCookie || !refreshTokenCookie) return;
  return { accessToken: accessTokenCookie.value, refreshToken: refreshTokenCookie.value };
};

export const getSupabaseClient = async () => {
  if (supabaseClientInstance) return supabaseClientInstance;

  const token = await getToken();
  if (!token) throw new Error('없는 사용자입니다.');

  supabaseClientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'memo' },
    global: {
      headers: {
        authorization: `Bearer ${token.accessToken}`,
      },
    },
  });
  return supabaseClientInstance;
};
