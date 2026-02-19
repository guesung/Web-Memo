import { getSafeConfig } from '@web-memo/env';

export const SUPABASE_URL =
  getSafeConfig("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = getSafeConfig("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const WEBAPP_URL =
  getSafeConfig("EXPO_PUBLIC_WEBAPP_URL", process.env.EXPO_PUBLIC_WEBAPP_URL);
export const GOOGLE_WEB_CLIENT_ID =
  getSafeConfig("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
