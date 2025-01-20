'use client';

import { ErrorBoundary, ErrorFallback, Loading } from '@extension/ui';
import ErrorContainer from '@src/components/error/ErrorContainer';
import { Suspense } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<Loading />}>
        <ErrorContainer error={error} reset={reset} />
      </Suspense>
    </ErrorBoundary>
  );
}
