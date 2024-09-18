import { getSafeConfig } from '../utils';

export const WEB_URL = getSafeConfig('WEB_URL', process.env.WEB_URL);
export const SUPABASE_URL = getSafeConfig('SUPABASE_URL', process.env.SUPABASE_URL);
export const SUPABASE_ANON_KEY = getSafeConfig('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
