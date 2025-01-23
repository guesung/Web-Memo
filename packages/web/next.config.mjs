import { withSentryConfig } from '@sentry/nextjs';

import { CONFIG } from '@extension/shared/constants';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: '**',
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default withSentryConfig(nextConfig, {
  org: 'guesung',
  project: 'web-memo',
  authToken: CONFIG.sentryAuthToken,
  silent: process.env.NODE_ENV === 'production',
});
