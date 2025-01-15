import { CONFIG, COOKIE_KEY, SUPABASE } from '@src/constants';
import { ChromeSyncStorage, StorageKeyType } from '@src/modules/chrome-storage';
import { Database } from '@src/types';
import { createClient } from '@supabase/supabase-js';

import { AuthService } from '../Supabase';

export const getSupabaseClient = async () => {
  try {
    const supabaseClientInstance = createClient<Database, 'memo'>(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
      db: { schema: SUPABASE.schema.memo },
      auth: {
        storage: {
          getItem: async key => {
            return (await ChromeSyncStorage.get(key as StorageKeyType)) ?? null;
          },
          setItem: async (key, value) => {
            return await ChromeSyncStorage.set(key as StorageKeyType, value);
          },
          removeItem: async key => {
            return await ChromeSyncStorage.remove(key as StorageKeyType);
          },
        },
      },
    });

    const isUserLogin = await new AuthService(supabaseClientInstance).checkUserLogin();
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

export const getFeedbackSupabaseClient = () => {
  return createClient<Database, 'feedback'>(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    db: { schema: SUPABASE.schema.feedback },
  });
};
