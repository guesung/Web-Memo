import { Button, ErrorBoundary, Loading } from '@extension/ui';
import { RefreshCwIcon } from 'lucide-react';

import { useSummaryContext } from './SummaryProvider';
import ToggleTheme from './ToggleTheme';

export default function Header() {
  const { isSummaryLoading, refetchSummary, category } = useSummaryContext();

  const getCategoryText = () => {
    if (category === 'youtube') return '- 유튜브';
    return '- 웹페이지';
  };

  return (
    <header className="mt-4 flex items-center justify-between">
      <div className="text-md font-bold">요약 {getCategoryText()}</div>
      <div className="flex gap-1">
        <ErrorBoundary>
          <ToggleTheme />
        </ErrorBoundary>
        {isSummaryLoading ? (
          <Button variant="outline" size="icon">
            <Loading />
          </Button>
        ) : (
          <Button variant="outline" size="icon" onClick={refetchSummary}>
            <RefreshCwIcon size={16} />
          </Button>
        )}
      </div>
    </header>
  );
}
