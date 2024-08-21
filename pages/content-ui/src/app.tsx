import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { queryPageSummaryFromBackground } from './query';
import { MOCK_OPEN_AI_API_RESPONSE } from './mock';

const getPageContent = () => {
  const fullText = document.body.innerText;
  return fullText.substring(0, 10000);
};

export default function App() {
  const [summary, setSummary] = useState(MOCK_OPEN_AI_API_RESPONSE);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);

  const toggleSummaryVisible = () => {
    setIsSummaryVisible(prev => !prev);
  };

  useEffect(() => {
    (async () => {
      const pageContent = getPageContent();
      const pageSummary = await queryPageSummaryFromBackground(pageContent);
      setSummary(pageSummary);
    })();
  }, []);

  return (
    <div className="fixed z-50 rounded-full bottom-4 right-4" onClick={toggleSummaryVisible} data-theme="light">
      {isSummaryVisible ? (
        <Markdown
          remarkPlugins={[remarkGfm]}
          className="markdown prose-sm max-w-[600px] border border-black-1 prose max-h-[400px] px-2 py-1 overflow-y-scroll cursor-pointer text-base-content rounded-xl bg-base-100">
          {summary}
        </Markdown>
      ) : (
        <button className="btn btn-circle">
          <span className="text-xs">S</span>
        </button>
      )}
    </div>
  );
}
