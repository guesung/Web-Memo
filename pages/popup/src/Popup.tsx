import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';

const Popup = () => {
  const [pageText, setPageText] = useState('');
  const [summary, setSummary] = useState('');

  // useEffect(async () => {
  //   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  //     const [activeTab] = tabs;
  //     if (activeTab.id) {
  //       chrome.tabs.sendMessage(activeTab.id, { type: 'get-page-content' }, response => {
  //         if (chrome.runtime.lastError) {
  //           console.error(chrome.runtime.lastError);
  //           return;
  //         }
  //         console.log(response.content);
  //         if (response && response.content) {
  //           setPageText(response.content);
  //         }
  //       });
  //     }
  //   });
  // }, []);

  const handleSummarizeClick = () => {
    // const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // if (!tab.id) return;
    // const { content } = await chrome.tabs.sendMessage(tab.id, { type: 'get-page-content' });

    // console.log(content);

    chrome.runtime.sendMessage(
      {
        type: 'summarize',
        payload: {
          content: '저는 박규성입니다.',
        },
      },
      response => {
        console.log(response);
      },
    );
  };

  return (
    <header className={`bg-base-300 ${summary && 'mockup-window'} block`}>
      {summary ? (
        <p className="px-8 py-4 bg-base-200 min-w-[800px] break-words">{summary}</p>
      ) : (
        <button onClick={handleSummarizeClick} className="btn btn-primary">
          Summarize this page !
        </button>
      )}
    </header>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
