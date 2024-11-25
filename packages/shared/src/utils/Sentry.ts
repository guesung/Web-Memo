/* eslint-disable import/namespace */
import * as Sentry from '@sentry/react';
import { isProduction } from './Environment';
import { CONFIG } from '@src/constants';

export const testSentry = () => {
  Sentry.captureException(new Error(`captureException Error 테스트`));
  Sentry.captureException(`captureException String 테스트1`);
  Sentry.captureMessage(`captureMessage 테스트2`);
};

export const initSentry = async () => {
  if (!isProduction) return;

  Sentry.init({
    dsn: CONFIG.sentryDsn,
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
