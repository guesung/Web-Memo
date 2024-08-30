import { BRIDGE_TYPE_SUMMARY, queryPageTextFromTab, withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SidePanel = () => {
  const [summary, setSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const startSummary = async () => {
    setIsSummaryLoading(true);
    setSummary('');
    const pageContent = await queryPageTextFromTab();
    const port = chrome.runtime.connect({ name: BRIDGE_TYPE_SUMMARY });
    port.postMessage({ pageContent });
    port.onMessage.addListener(message => setSummary(prev => prev + message));
    port.onDisconnect.addListener(() => setIsSummaryLoading(false));
  };

  useEffect(() => {
    (async () => {
      await startSummary();
    })();
  }, []);

  return (
    <main className="prose prose-sm">
      <header className="navbar">
        {isSummaryLoading ? (
          <span className="loading loading-bars loading-sm" />
        ) : (
          <button>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={24} onClick={startSummary}>
              <circle cx="50" cy="50" r="45" fill="currentColor" />
              <polygon points="40,30 70,50 40,70" fill="white" />
            </svg>
          </button>
        )}
      </header>

      <Markdown remarkPlugins={[remarkGfm]} className="markdown px-4">
        {summary}
      </Markdown>
    </main>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
