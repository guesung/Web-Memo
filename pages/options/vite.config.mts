import { resolve } from 'path';
import { withPageConfig } from '@extension/vite-config';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  publicDir: resolve(rootDir, 'public'),
  build: {
    outDir: resolve(rootDir, '..', '..', 'dist', 'options'),
    sourcemap: true,
  },
  plugins: [
    sentryVitePlugin({
      org: 'guesung',
      project: 'web-memo',
      authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
    }),
  ],
});
