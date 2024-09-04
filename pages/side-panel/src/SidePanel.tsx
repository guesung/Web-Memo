import { OverlayProvider } from 'overlay-kit';

import { withErrorBoundary, withSuspense } from '@extension/shared';
import { Loading, Memo, Summary } from './components';
import { Option, Refresh } from './icons';
import { useGetSummary } from './hooks';

const SidePanel = () => {
  const { startSummary, summary, isSummaryLoading } = useGetSummary();
  const handleOptionClick = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <OverlayProvider>
      <main className="prose prose-sm flex flex-col h-lvh px-4 relative">
        <div className="absolute right-4 top-4 flex gap-1 items-center">
          {isSummaryLoading ? (
            <Loading />
          ) : (
            <button onClick={startSummary}>
              <Refresh />
            </button>
          )}
          <button onClick={handleOptionClick}>
            <Option />
          </button>
        </div>
        <Summary summary={summary} />
        <Memo />
      </main>
    </OverlayProvider>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
