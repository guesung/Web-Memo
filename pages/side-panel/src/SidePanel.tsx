import { OverlayProvider } from 'overlay-kit';

import { ErrorBoundary, withSuspense } from '@extension/shared';
import { Header, Memo, Summary, SummaryProvider } from './components';

const SidePanel = () => {
  return (
    <OverlayProvider>
      <main className="prose prose-sm flex flex-col h-lvh px-4 relative">
        <SummaryProvider>
          <Header />
          <section className="flex-1 overflow-scroll">
            <ErrorBoundary>
              <Summary />
            </ErrorBoundary>
          </section>
        </SummaryProvider>
        <section className="flex-1">
          <ErrorBoundary>
            <Memo />
          </ErrorBoundary>
        </section>
      </main>
    </OverlayProvider>
  );
};

export default withSuspense(SidePanel, <div> Loading ... </div>);
