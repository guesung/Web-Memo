import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';
import { queryPageSummaryFromBackground, queryPageTextFromTab } from './query';

const Popup = () => {
  const [summary, setSummary] = useState('');

  useEffect(() => {
    (async () => {
      const pageText = await queryPageTextFromTab();
      console.log(pageText);
      if (!pageText) return;
      const pageSummary = await queryPageSummaryFromBackground(pageText);
      console.log(pageSummary);
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
