import { OverlayProvider } from 'overlay-kit';

import { ErrorBoundary } from '@extension/ui';
import { Header, Memo, Summary, SummaryProvider } from './components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function SidePanel() {
  return (
    <QueryClientProvider client={queryClient}>
      <OverlayProvider>
        <main className="prose prose-sm flex flex-col h-lvh px-4 relative">
          <section className="flex-1 overflow-scroll">
            <ErrorBoundary>
              <SummaryProvider>
                <Header />
                <Summary />
              </SummaryProvider>
            </ErrorBoundary>
          </section>
          <section className="flex-1">
            <ErrorBoundary>
              <Memo />
            </ErrorBoundary>
          </section>
        </main>
      </OverlayProvider>
    </QueryClientProvider>
  );
}
