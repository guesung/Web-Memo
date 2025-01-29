'use client';

import { ErrorBoundary, ErrorFallback, Loading } from '@extension/ui';
import { ErrorSection } from '@src/app/_components';
import { Suspense } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<Loading />}>
        <ErrorSection error={error} reset={reset} />
      </Suspense>
    </ErrorBoundary>
  );
}
