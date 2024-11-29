import { CONFIG, COOKIE_KEY, SUPABASE } from '@src/constants';
import { Database, StorageKeyType } from '@src/types';
import { createClient } from '@supabase/supabase-js';

import { checkUserLogin } from '../Supabase';
import { Storage } from './module';

export const getSupabaseClient = async () => {
  try {
    const supabaseClientInstance = createClient<Database>(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
      db: { schema: SUPABASE.schemaMemo },
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
      name: COOKIE_KEY.accessToken,
      url: CONFIG.webUrl,
    });
    const refreshTokenCookieFromWeb = await chrome.cookies.get({
      name: COOKIE_KEY.refreshToken,
      url: CONFIG.webUrl,
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
