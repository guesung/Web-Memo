import { useGetSummary } from '@src/hooks';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Option, Refresh } from '../icons';

export default function Summary() {
  const { startSummary, summary, isSummaryLoading } = useGetSummary();
  const handleOption = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <section className="flex-1 overflow-scroll">
      <div className="absolute right-4 top-4 flex gap-1 items-center">
        <Refresh width="20px" height="20px" isLoading={isSummaryLoading} onRefresh={startSummary} />
        <Option width="24px" height="24px" onOption={handleOption} />
      </div>
      <Markdown remarkPlugins={[remarkGfm]} className="markdown">
        {summary}
      </Markdown>
    </section>
  );
}
