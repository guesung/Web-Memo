import {
  BRIDGE_TYPE_SUMMARY,
  getCurrentTab,
  queryPageTextFromTab,
  withErrorBoundary,
  withSuspense,
} from '@extension/shared';
import '@src/SidePanel.css';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SidePanel = () => {
  const [summary, setSummary] = useState('');

  const startSummary = async () => {
    if (summary) return;
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
    <Markdown
      remarkPlugins={[remarkGfm]}
      className="markdown shadow-xl prose-sm max-w-[600px] prose max-h-[400px] px-2 py-1 overflow-y-scroll cursor-pointer text-base-content rounded-xl bg-base-100">
      {summary}
    </Markdown>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
