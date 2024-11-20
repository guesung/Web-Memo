import { useDidMount } from '@extension/shared/hooks';
import { responseGetSidePanelOpen } from '@extension/shared/utils/extension';
import { ErrorBoundary, Loading, Toaster } from '@extension/ui';
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
  useDidMount(responseGetSidePanelOpen);

  return (
    <QueryProvider>
      <main className="prose prose-sm bg-background text-foreground relative flex h-lvh flex-col px-4">
        <section className="flex-1 overflow-scroll">
          <ErrorBoundary>
            <SummaryProvider>
              <SummaryHeader />
              <Summary />
            </SummaryProvider>
          </ErrorBoundary>
        </section>
        <section className="flex h-1/2 flex-col">
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
      <Toaster />
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryProvider>
  );
}
