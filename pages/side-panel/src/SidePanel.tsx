import { OverlayProvider } from 'overlay-kit';

import { SummaryType, SyncStorage, Tab, urlToKey, withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loading } from './components';
import { useSummary } from './hooks';
import { Save, Start } from './icons';

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
        <header className="navbar flex justify-center">
          {isSummaryLoading ? (
            <Loading />
          ) : (
            <div className="flex gap-4">
              <button onClick={startSummary}>
                <Start />
              </button>
              <button onClick={startSave}>
                <Save />
              </button>
            </div>
          )}
        </header>

        <Markdown remarkPlugins={[remarkGfm]} className="markdown px-4">
          {summary}
        </Markdown>
      </main>
    </OverlayProvider>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
