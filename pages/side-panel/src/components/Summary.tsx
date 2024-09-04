import { useDidMount } from '@extension/shared';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SummaryProps {
  summary: string;
  startSummary: () => void;
}

export default function Summary({ summary, startSummary }: SummaryProps) {
  useDidMount(startSummary);

  return (
    <Markdown remarkPlugins={[remarkGfm]} className="markdown flex-1 overflow-scroll">
      {summary}
    </Markdown>
  );
}
