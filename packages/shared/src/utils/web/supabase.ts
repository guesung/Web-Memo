import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@src/constants';
import { Database } from '@src/types';
import { createClient } from '@supabase/supabase-js';
import { isServer } from './environment';

export const getSupabaseClient = () =>
  createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
    db: { schema: 'memo' },
  });
