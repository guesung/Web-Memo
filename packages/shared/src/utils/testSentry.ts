/* eslint-disable import/namespace */
import * as Sentry from '@sentry/react';

export const testSentry = () => {
  Sentry.captureException(new Error(`captureException Error 테스트`));
  Sentry.captureException(`captureException String 테스트1`);
  Sentry.captureMessage(`captureMessage 테스트2`);
};
