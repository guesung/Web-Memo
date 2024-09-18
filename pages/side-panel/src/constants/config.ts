import { getSafeConfig } from '@extension/shared/lib/utils';

export const SENTRY_DSN = getSafeConfig('SENTRY_DSN', import.meta.env.VITE_SENTRY_DSN);
export const WEBHOOK_NOTION_API = getSafeConfig('WEBHOOK_NOTION_API', import.meta.env.VITE_MAKE_WEBHOOK_NOTION_API);
