'use client';
import { ErrorBoundary, ErrorFallback, Loading } from '@extension/ui';
import { Suspense } from 'react';

import NotFoundSection from './_components/NotFoundSection';

export default function NotFoundPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<Loading />}>
        <NotFoundSection />
      </Suspense>
    </ErrorBoundary>
  );
}
