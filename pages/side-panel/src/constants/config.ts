import { getSafeConfig } from '@extension/shared';

export const WEBHOOK_NOTION_API = getSafeConfig('WEBHOOK_NOTION_API', import.meta.env.VITE_MAKE_WEBHOOK_NOTION_API);
