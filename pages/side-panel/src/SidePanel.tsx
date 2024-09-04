import { OverlayProvider } from 'overlay-kit';

import { withErrorBoundary, withSuspense } from '@extension/shared';
import { Memo, Summary } from './components';
import { useGetSummary } from './hooks';
import { Option, Refresh } from './icons';

const SidePanel = () => {
  const { startSummary, summary, isSummaryLoading } = useGetSummary();
  const handleOptionClick = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <OverlayProvider>
      <main className="prose prose-sm flex flex-col h-lvh px-4 relative">
        <div className="absolute right-4 top-4 flex gap-1 items-center">
          <Refresh width="20px" height="20px" isLoading={isSummaryLoading} onRefresh={startSummary} />
          <Option width="24px" height="24px" onOption={handleOptionClick} />
        </div>
        <Summary summary={summary} />
        <Memo />
      </main>
    </OverlayProvider>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
