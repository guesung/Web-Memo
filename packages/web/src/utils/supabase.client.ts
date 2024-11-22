import { SUPABASE_SCHEMA_MEMO } from '@extension/shared/constants';
import { Database } from '@extension/shared/types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@src/constants';
import { createBrowserClient } from '@supabase/ssr';

export const getSupabaseClient = () =>
  createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
    db: { schema: SUPABASE_SCHEMA_MEMO },
  });
