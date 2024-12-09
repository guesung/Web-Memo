import { useSummaryContext } from './SummaryProvider';

export default function Summary() {
  const { summary, errorMessage } = useSummaryContext();

  if (errorMessage) return <p className="whitespace-pre-wrap">{errorMessage}</p>;
  return <p className="whitespace-pre-wrap">{summary}</p>;
}
