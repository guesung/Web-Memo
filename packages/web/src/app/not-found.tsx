'use client';
import { ErrorBoundary, ErrorFallback, Loading } from '@extension/ui';
import { NotFoundSection } from '@src/app/_components';
import { Suspense } from 'react';

export default function NotFoundPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<Loading />}>
        <NotFoundSection />
      </Suspense>
    </ErrorBoundary>
  );
}
