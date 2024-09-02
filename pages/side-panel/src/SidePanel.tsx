import { OverlayProvider } from 'overlay-kit';

import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect } from 'react';
import { Header, Summary } from './components';
import { useGetSummary } from './hooks';
import { startSave } from './utils';

const SidePanel = () => {
  const { isSummaryLoading, startSummary, summary } = useGetSummary();

  useEffect(() => {
    (async () => {
      await startSummary();
    })();
  }, []);

  return (
    <OverlayProvider>
      <main className="prose prose-sm">
        <Header isSummaryLoading={isSummaryLoading} startSave={() => startSave(summary)} startSummary={startSummary} />
        <Summary summary={summary} />
      </main>
    </OverlayProvider>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
