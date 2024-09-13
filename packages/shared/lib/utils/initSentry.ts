/* eslint-disable import/namespace */
import * as Sentry from '@sentry/react';
import { getIsProduction } from './getIsProduction';

export const initSentry = async (sentryDsn: string) => {
  const isProduction = await getIsProduction();
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
      Sentry.browserProfilingIntegration(),
    ],

    tracesSampleRate: isProduction ? 1.0 : 0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    release: '0.3.1',
  });
};
