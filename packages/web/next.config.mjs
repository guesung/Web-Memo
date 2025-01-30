import { CONFIG } from '@extension/shared/constants';
import { withSentryConfig } from '@sentry/nextjs';

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
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  telemetry: false,
});
