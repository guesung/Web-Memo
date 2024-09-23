import { getSafeConfig } from '../utils';

export const WEB_URL = getSafeConfig('WEB_URL', process.env.WEB_URL);
export const SUPABASE_URL = getSafeConfig('SUPABASE_URL', process.env.SUPABASE_URL);
export const SUPABASE_ANON_KEY = getSafeConfig('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
export const SENTRY_DSN = getSafeConfig('SENTRY_DSN', process.env.SENTRY_DSN);
export const SENTRY_AUTH_TOKEN = getSafeConfig('SENTRY_DSN', process.env.SENTRY_AUTH_TOKEN);
export const NODE_ENV = getSafeConfig('SENTRY_DSN', process.env.NODE_ENV) as 'development' | 'production';
