/* eslint-disable import/namespace */
import * as Sentry from '@sentry/react';

export const initSentry = (sentryDsn: string) => {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
      Sentry.browserProfilingIntegration(),
    ],

    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    release: '0.3.1',
  });
};
