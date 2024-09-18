import { getSafeConfig } from '../../lib/utils';

export const WEB_URL = getSafeConfig('WEB_URL', process.env.WEB_URL);
