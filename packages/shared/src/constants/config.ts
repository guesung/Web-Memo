export const getSafeConfig = (name: string, value: string | undefined): string => {
  if (value === undefined) throw new Error(`${name}이 설정되지 않았습니다.`);
  else return value;
};

export const WEB_URL = getSafeConfig('WEB_URL', process.env.WEB_URL);
export const SUPABASE_URL = getSafeConfig('SUPABASE_URL', process.env.SUPABASE_URL);
export const SUPABASE_ANON_KEY = getSafeConfig('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
export const SENTRY_DSN = getSafeConfig('SENTRY_DSN', process.env.SENTRY_DSN);
export const SENTRY_AUTH_TOKEN = getSafeConfig('SENTRY_DSN', process.env.SENTRY_AUTH_TOKEN);
export const NODE_ENV = getSafeConfig('SENTRY_DSN', process.env.NODE_ENV) as 'development' | 'production';
export const MAKE_WEBHOOK_NOTION_API = getSafeConfig('SENTRY_DSN', process.env.MAKE_WEBHOOK_NOTION_API) as
  | 'development'
  | 'production';
export const OPENAI_API_KEY = getSafeConfig('SENTRY_DSN', process.env.OPENAI_API_KEY);
