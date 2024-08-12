import { useStorageSuspense, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useEffect, useState } from 'react';

const Popup = () => {
  const theme = useStorageSuspense(exampleThemeStorage);
  const isLight = theme === 'light';
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
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <button onClick={handlePopup}>Summarize this page !</button>
        {summary && <p>{summary}</p>}
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
