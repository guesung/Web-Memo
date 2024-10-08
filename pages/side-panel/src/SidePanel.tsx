import { OverlayProvider } from 'overlay-kit';

import { ErrorBoundary, Loading } from '@extension/ui';
import { SummaryHeader, MemoForm, MemoHeader, Summary, SummaryProvider, LoginSection } from './components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Suspense } from 'react';

const queryClient = new QueryClient();

export default function SidePanel() {
  return (
    <QueryClientProvider client={queryClient}>
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
          <section className="flex-1">
            <ErrorBoundary>
              <Suspense fallback={<Loading />}>
                <MemoHeader />
              </Suspense>
            </ErrorBoundary>
            <ErrorBoundary FallbackComponent={LoginSection}>
              <Suspense fallback={<Loading />}>
                <MemoForm />
              </Suspense>
            </ErrorBoundary>
          </section>
        </main>
      </OverlayProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
