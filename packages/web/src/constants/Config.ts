import { getSafeConfig } from '@extension/shared/constants';

export const SUPABASE_URL = getSafeConfig('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = getSafeConfig(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
export const WEB_URL = getSafeConfig('NEXT_PUBLIC_WEB_URL', process.env.NEXT_PUBLIC_WEB_URL);
