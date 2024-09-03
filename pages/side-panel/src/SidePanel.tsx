import { OverlayProvider } from 'overlay-kit';

import { withErrorBoundary, withSuspense } from '@extension/shared';
import { Memo, Summary } from './components';

const SidePanel = () => {
  return (
    <OverlayProvider>
      <main className="prose prose-sm flex flex-col h-lvh px-4">
        {/* <Header isSummaryLoading={isSummaryLoading} startSave={() => startSave(summary)} startSummary={startSummary} /> */}
        <Summary />
        <Memo />
      </main>
    </OverlayProvider>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
