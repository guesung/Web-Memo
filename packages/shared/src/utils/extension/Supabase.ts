import {
  COOKIE_KEY_ACCESS_TOKEN,
  COOKIE_KEY_REFRESH_TOKEN,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  WEB_URL,
} from '@src/constants';
import { Database, MemoSupabaseClient, StorageKeyType } from '@src/types';
import { createClient } from '@supabase/supabase-js';
import { Storage } from './module';
import { checkUserLogin } from '../Supabase';

let supabaseClientInstance: MemoSupabaseClient | null = null;

export const getSupabaseClient = async () => {
  try {
    if (supabaseClientInstance) return supabaseClientInstance;

    supabaseClientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: { schema: 'memo' },
      auth: {
        storage: {
          getItem: async key => {
            return (await Storage.get(key as StorageKeyType)) ?? null;
          },
          setItem: async (key, value) => {
            return await Storage.set(key as StorageKeyType, value);
          },
          removeItem: async key => {
            return await Storage.remove(key as StorageKeyType);
          },
        },
      },
    });

    const isUserLogin = await checkUserLogin(supabaseClientInstance);
    if (isUserLogin) return supabaseClientInstance;

    const accessTokenFromWeb = await chrome.cookies.get({
      name: COOKIE_KEY_ACCESS_TOKEN,
      url: WEB_URL,
    });
    const refreshTokenCookieFromWeb = await chrome.cookies.get({
      name: COOKIE_KEY_REFRESH_TOKEN,
      url: WEB_URL,
    });

    if (!accessTokenFromWeb || !refreshTokenCookieFromWeb) throw new Error('로그인을 먼저 해주세요.');

    await supabaseClientInstance.auth.setSession({
      access_token: accessTokenFromWeb.value,
      refresh_token: refreshTokenCookieFromWeb.value,
    });

    return supabaseClientInstance;
  } catch (e) {
    throw new Error('로그인을 먼저 해주세요');
  }
};
