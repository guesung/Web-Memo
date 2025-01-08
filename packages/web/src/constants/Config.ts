import { getSafeConfig } from '@extension/shared/constants';

export const CONFIG = {
  webUrl: getSafeConfig('NEXT_PUBLIC_WEB_URL', process.env.NEXT_PUBLIC_WEB_URL),
  supabaseUrl: getSafeConfig('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: getSafeConfig('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  gaId: getSafeConfig('NEXT_PUBLIC_GA_ID', process.env.NEXT_PUBLIC_GA_ID),
};
