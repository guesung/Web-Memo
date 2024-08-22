import { queryPageSummaryFromBackground } from '@src/query';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactComponent from '../../public/logo.svg';

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

  useEffect(() => {
    setSummary('');
    setIsSummaryVisible(false);
  }, [window.location.href]);

  if (isLoading) return <span className="loading loading-spinner loading-lg" />;
  else if (!isSummaryVisible)
    return (
      <button
        className="flex items-center justify-center text-xs bg-transparent rounded-full btn btn-circle tooltip"
        data-tip="Summary"
        onClick={handleSummaryOpen}>
        <ReactComponent width={28} height={28} />
      </button>
    );
  else
    return (
      <div onClick={handleSummaryClose} onKeyUp={handleSummaryClose} role="button" tabIndex={0}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          className="markdown shadow-xl prose-sm max-w-[600px] prose max-h-[400px] px-2 py-1 overflow-y-scroll cursor-pointer text-base-content rounded-xl bg-base-100">
          {summary}
        </Markdown>
      </div>
    );
}
