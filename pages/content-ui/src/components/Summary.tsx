import { queryPageSummaryFromBackground } from '@src/query';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const getPageContent = () => {
  const fullText = document.body.innerText;
  return fullText.substring(0, 10000);
};

export default function Summary() {
  const [summary, setSummary] = useState('');
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSummaryOpen = async () => {
    if (!summary) {
      // 요약이 없을 때만 요약 요청
      setIsLoading(true);
      const pageContent = getPageContent();
      const pageSummary = await queryPageSummaryFromBackground(pageContent);
      setSummary(pageSummary);
      setIsLoading(false);
    }

    setIsSummaryVisible(true);
  };

  const handleSummaryClose = () => {
    setIsSummaryVisible(false);
  };

  if (isLoading) return <span className="loading loading-spinner loading-lg" />;
  else if (!isSummaryVisible)
    return (
      <button className="text-xs rounded-full btn btn-circle tooltip" data-tip="Summary" onClick={handleSummaryOpen}>
        S
      </button>
    );
  else
    return (
      <div onClick={handleSummaryClose}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          className="markdown shadow-xl prose-sm max-w-[600px] prose max-h-[400px] px-2 py-1 overflow-y-scroll cursor-pointer text-base-content rounded-xl bg-base-100">
          {summary}
        </Markdown>
      </div>
    );
}
