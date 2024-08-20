import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { queryPageSummaryFromBackground, queryPageTextFromTab } from './query';

const Popup = () => {
  const [summary, setSummary] = useState('');

  useEffect(() => {
    (async () => {
      const pageText = await queryPageTextFromTab();
      if (!pageText) return;
      const pageSummary = await queryPageSummaryFromBackground(pageText);
      console.log(pageSummary);
      setSummary(pageSummary);
    })();
  }, []);

  if (!summary) return <span className="loading loading-ring loading-md" />;
  return (
    <header className="px-4 ">
      <Markdown remarkPlugins={[remarkGfm]} className="markdown-content w-[600px]">
        {summary}
      </Markdown>
    </header>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
