import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useSummaryContext } from './SummaryProvider';

export default function Summary() {
  const { summary } = useSummaryContext();

  return (
    <Markdown remarkPlugins={[remarkGfm]} className="markdown">
      {summary}
    </Markdown>
  );
}
