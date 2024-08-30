import { BRIDGE_TYPE_SUMMARY, queryPageTextFromTab, withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SidePanel = () => {
  const [summary, setSummary] = useState('');

  const startSummary = async () => {
    const pageContent = await queryPageTextFromTab();
    const port = chrome.runtime.connect({ name: BRIDGE_TYPE_SUMMARY });
    port.postMessage({ pageContent });
    port.onMessage.addListener(message => {
      setSummary(prev => prev + message);
    });
  };

  useEffect(() => {
    (async () => {
      await startSummary();
    })();
  }, []);

  return (
    <Markdown remarkPlugins={[remarkGfm]} className="markdown px-4 py-2 prose prose-sm">
      {summary}
    </Markdown>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
