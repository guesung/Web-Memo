import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SummaryProps {
  summary: string;
}

export default function Summary({ summary }: SummaryProps) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} className="markdown flex-1 overflow-scroll">
      {summary}
    </Markdown>
  );
}
