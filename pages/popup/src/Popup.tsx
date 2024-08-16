import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';

const queryPageText = () =>
  new Promise(resolve => {
    let pageText = '';
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
      const [activeTab] = tabs;
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'get-page-content' }, response => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
          }
          if (response && response.content) {
            pageText = response.content;
          }
          resolve(pageText);
        });
      }
    });
  });

const queryPageSummary = (pageText: string) =>
  new Promise(resolve => {
    let pageSummary = '';
    chrome.runtime.sendMessage(
      {
        type: 'summarize',
        payload: {
          content: pageText,
        },
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        if (response && response.message) {
          pageSummary = response.message;
        }
        resolve(pageSummary);
      },
    );
  });

const Popup = () => {
  const [summary, setSummary] = useState('');

  useEffect(() => {
    (async () => {
      const pageText = await queryPageText();
      if (!pageText) return;
      const pageSummary = await queryPageSummary(pageText);
      setSummary(pageSummary);
    })();
  }, []);

  if (!summary) return <div>Loading ...</div>;
  return (
    <header className={`bg-base-300 ${summary && 'mockup-window'} block`}>
      <p className="px-8 py-4 bg-base-200 min-w-[800px] break-words">{summary}</p>
    </header>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
