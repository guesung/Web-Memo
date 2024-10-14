import { OverlayProvider } from 'overlay-kit';

import { ErrorBoundary } from '@extension/ui';
import { LoadingFallback } from '@extension/ui/lib/components';
import { Suspense } from 'react';
import {
  LoginSection,
  MemoForm,
  MemoHeader,
  QueryProvider,
  Summary,
  SummaryHeader,
  SummaryProvider,
} from './components';

export default function SidePanel() {
  return (
    <QueryProvider>
      <OverlayProvider>
        <main className="prose prose-sm flex flex-col h-lvh px-4 relative">
          <section className="flex-1 overflow-scroll">
            <ErrorBoundary>
              <SummaryProvider>
                <SummaryHeader />
                <Summary />
              </SummaryProvider>
            </ErrorBoundary>
          </section>
          <section className="h-1/2 flex flex-col">
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <MemoHeader />
              </Suspense>
            </ErrorBoundary>
            <ErrorBoundary FallbackComponent={LoginSection}>
              <Suspense fallback={<LoadingFallback />}>
                <MemoForm />
              </Suspense>
            </ErrorBoundary>
          </section>
        </main>
      </OverlayProvider>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryProvider>
  );
}
