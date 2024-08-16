import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';
import { queryPageSummaryFromBackground, queryPageTextFromTab } from './query';

const Popup = () => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const pageText = await queryPageTextFromTab();
      if (!pageText) return;
      const pageSummary = await queryPageSummaryFromBackground(pageText);
      console.log(pageSummary);
      setSummary(pageSummary);
    })();
    setLoading(false);
  }, []);

  if (!summary) return <span className="loading loading-ring loading-md" />;
  return (
    <header className={`bg-base-300 block ${summary && 'mockup-window'}`}>
      <p className="px-8 py-4 bg-base-200 min-w-[800px] break-words">{summary}</p>
    </header>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
