import { CONFIG, SUPABASE } from '@src/constants';
import type { Database } from '@src/types';
import { createBrowserClient } from '@supabase/ssr';

export const getSupabaseClient = () => {
  return createBrowserClient<Database>(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    auth: {
      storage: {
        getItem: key => {
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
    db: { schema: SUPABASE.schema.memo },
  });
};

export const getFeedbackSupabaseClient = () => {
  return createBrowserClient<Database>(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    db: { schema: SUPABASE.schema.feedback },
  });
};
