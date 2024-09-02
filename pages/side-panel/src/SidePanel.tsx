import { overlay, OverlayProvider } from 'overlay-kit';

import {
  BRIDGE_TYPE_SUMMARY,
  queryPageTextFromTab,
  SummaryStorage,
  SummaryType,
  SyncStorage,
  urlToKey,
  withErrorBoundary,
  withSuspense,
} from '@extension/shared';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SidePanel = () => {
  const [summary, setSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const startSummary = async () => {
    setIsSummaryLoading(true);
    setSummary('');
    let pageContent = '';
    try {
      pageContent = await queryPageTextFromTab();
    } catch (e) {
      setIsSummaryLoading(false);
      setSummary('Failed to get page content');
      return;
    }

    const port = chrome.runtime.connect({ name: BRIDGE_TYPE_SUMMARY });
    port.postMessage({ pageContent });
    port.onMessage.addListener(async message => {
      setSummary(prev => prev + message);
      if (message === null) {
        setIsSummaryLoading(false);
      }
    });
  };

  const startSave = async () => {
    const prevSummaryList = await SyncStorage.get<SummaryStorage>();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(prevSummaryList);

    if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

    const urlKey = urlToKey(tab.url);

    await SyncStorage.set<SummaryType>(urlKey, {
      title: tab.title,
      summary: summary,
      date: new Date().toISOString(),
    });

    overlay.open(({ open, close }) => {
      return (
        <div className="toast toast-end">
          <div className="alert alert-success">
            <span>Storage save successfully.</span>
          </div>
        </div>
      );
    });
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
            <span className="loading loading-bars loading-sm" />
          ) : (
            <div className="flex gap-4">
              <button onClick={startSummary}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={24}>
                  <circle cx="50" cy="50" r="45" fill="currentColor" />
                  <polygon points="40,30 70,50 40,70" fill="white" />
                </svg>
              </button>
              <button onClick={startSave}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={24}>
                  <path
                    d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <polyline
                    points="17 21 17 13 7 13 7 21"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <polyline
                    points="7 3 7 8 15 8"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
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
