import { isServer } from '@extension/shared';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@src/constants';
import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: {
        getItem: key => {
          if (isServer) return '';
          return document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`))?.[2] ?? '';
        },
        setItem: (key, value) => {
          document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Strict; Secure`;
        },
        removeItem: key => {
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        },
      },
    },
  });
};

export const supabaseClient = getSupabaseClient();

export const getUser = async () => {
  const user = await supabaseClient.auth.getUser();
  return user;
};

type ProviderType = 'google' | 'kakao';

export const signInOAuth = async (provider: ProviderType) => {
  await supabaseClient.auth.signInWithOAuth({
    provider,
  });
};
