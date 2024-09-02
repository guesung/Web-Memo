import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SummaryProps {
  summary: string;
}

export default function Summary({ summary }: SummaryProps) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} className="markdown px-4">
      {summary}
    </Markdown>
  );
}
