import { BRIDGE_TYPE_PAGE_CONTENT } from '@extension/shared';

const getPageContent = () => {
  const fullText = document.body.innerText;
  return fullText.substring(0, 10000);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;
  if (message.type === BRIDGE_TYPE_PAGE_CONTENT) {
    const content = getPageContent();
    sendResponse({ content });
  }
});

export default function App() {
  return <div></div>;
}
