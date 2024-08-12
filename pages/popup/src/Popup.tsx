import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';

const Popup = () => {
  const [pageText, setPageText] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const activeTab = tabs[0];
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'get-page-content' }, response => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
          }
          if (response && response.content) {
            setPageText(response.content);
          }
        });
      }
    });
  }, []);

  const handlePopup = () => {
    chrome.runtime.sendMessage(
      {
        type: 'summarize',
        payload: {
          pageText,
        },
      },
      response => {
        setSummary(response.message);
      },
    );
  };

  return (
    <header className={`bg-base-300 ${summary && 'mockup-window'} block`}>
      {summary ? (
        <p className="px-8 py-4 bg-base-200 max-w-[400] break-words">
          summarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummarysummary
        </p>
      ) : (
        <button onClick={handlePopup} className="btn btn-primary">
          Summarize this page !
        </button>
      )}
    </header>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
