/* eslint-disable import/namespace */
import * as Sentry from '@sentry/react';
import { SENTRY_DSN } from '../../constants';
import { isProduction } from '../isProduction';

export const initSentry = async () => {
  Sentry.init({
    dsn: SENTRY_DSN,
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
