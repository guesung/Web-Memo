'use client';
import { Suspense } from 'react';
import { ErrorBoundary, ErrorFallback, Loading } from '@extension/ui';
import NotFoundContainer from '@src/components/error/NotFoundContainer';
import { LanguageParams } from '@src/modules/i18n';

interface NotFoundPageProps extends LanguageParams {}

export default function NotFoundPage({ params: { lng } }: NotFoundPageProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<Loading />}>
        <NotFoundContainer lng={lng} />
      </Suspense>
    </ErrorBoundary>
  );
}
