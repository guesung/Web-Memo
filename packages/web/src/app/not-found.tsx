'use client';
import { ErrorBoundary, ErrorFallback, Loading } from '@extension/ui';
import { NotFoundContainer } from '@src/app/_components';
import { Suspense } from 'react';

export default function NotFoundPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<Loading />}>
        <NotFoundContainer />
      </Suspense>
    </ErrorBoundary>
  );
}
