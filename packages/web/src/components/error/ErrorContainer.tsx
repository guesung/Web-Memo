'use client';

import * as Sentry from '@sentry/nextjs';

import { Button } from '@extension/ui';
import { useEffect } from 'react';

interface ErrorContainerProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorContainer({ error, reset }: ErrorContainerProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      level: 'fatal',
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">문제가 발생했습니다</h1>
      <p className="max-w-lg text-xl text-gray-600 dark:text-gray-300">{error.message}</p>
      <Button onClick={reset} className="mt-4 px-6 py-3 text-lg shadow-lg transition-all duration-300 hover:shadow-xl">
        다시 시도하기
      </Button>
    </div>
  );
}
