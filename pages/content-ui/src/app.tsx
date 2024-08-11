import { useEffect } from 'react';

export default function App() {
  const getPageContent = () => {
    const fullText = document.body.innerText;
    return fullText.substring(0, 10000);
  };

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'get-page-content') {
        const pageText = getPageContent();
        sendResponse({ content: pageText });
      }
    });
  }, []);

  return <div></div>;
}
