import { Button, ErrorBoundary, Loading } from '@extension/ui';
import { RefreshCwIcon } from 'lucide-react';

import { useSummaryContext } from './SummaryProvider';
import ToggleTheme from './ToggleTheme';

export default function Header() {
  const { isSummaryLoading, refetchSummary, category } = useSummaryContext();

  return (
    <header className="mt-4 flex items-center justify-between">
      <div className="text-lg font-bold">{category === 'youtube' ? 'Youtube' : 'Summary'}</div>
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
