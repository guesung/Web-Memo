import { OverlayProvider } from 'overlay-kit';

import { SummaryType, SyncStorage, Tab, urlToKey, withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect } from 'react';
import { Header, Summary } from './components';
import { useSummary } from './hooks';

const SidePanel = () => {
  const { isSummaryLoading, startSummary, summary } = useSummary();

  const startSave = async () => {
    const tab = await Tab.get();

    if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

    const urlKey = urlToKey(tab.url);

    await SyncStorage.set<SummaryType>(urlKey, {
      title: tab.title,
      summary,
      date: new Date().toISOString(),
    });

    // overlay.open(({ open, close }) => {
    //   return (
    //     <div className="toast toast-end">
    //       <div className="alert alert-success">
    //         <span>Storage save successfully.</span>
    //       </div>
    //     </div>
    //   );
    // });
  };

  useEffect(() => {
    (async () => {
      await startSummary();
    })();
  }, []);

  return (
    <OverlayProvider>
      <main className="prose prose-sm">
        <Header isSummaryLoading={isSummaryLoading} startSave={startSave} startSummary={startSummary} />
        <Summary summary={summary} />
      </main>
    </OverlayProvider>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
