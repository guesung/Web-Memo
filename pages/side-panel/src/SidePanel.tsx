import {
  queryPageSummaryFromBackground,
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
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const startSummary = async () => {
    if (!summary) {
      setIsLoading(true);
      const pageContent = await queryPageTextFromTab();
      const pageSummary = await queryPageSummaryFromBackground(pageContent);
      setSummary(pageSummary);
      setIsLoading(false);
    }
    setIsSummaryVisible(true);
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
