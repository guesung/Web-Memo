import { useDidMount } from '@extension/shared';
import { useGetSummary } from '@src/hooks';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Summary() {
  const { isSummaryLoading, startSummary, summary } = useGetSummary();

  useDidMount(startSummary);

  return (
    <Markdown remarkPlugins={[remarkGfm]} className="markdown flex-1 overflow-scroll">
      {summary}
    </Markdown>
  );
}
