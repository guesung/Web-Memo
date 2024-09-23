import { getSafeConfig } from '@extension/shared';

export const SUPABASE_URL = getSafeConfig('SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = getSafeConfig('SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
