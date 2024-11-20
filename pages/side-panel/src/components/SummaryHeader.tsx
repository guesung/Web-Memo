import { Button } from '@extension/ui';
import { LoaderCircle, RefreshCwIcon } from 'lucide-react';
import { useSummaryContext } from './SummaryProvider';
import ToggleTheme from './ToggleTheme';

export default function Header() {
  const { isSummaryLoading, refetchSummary } = useSummaryContext();

  return (
    <header className="float-right mt-4 flex items-center gap-1">
      <ToggleTheme />
      {isSummaryLoading ? (
        <Button variant="outline" size="icon">
          <LoaderCircle className="animate-spin" size={16} />
        </Button>
      ) : (
        <Button variant="outline" size="icon" onClick={refetchSummary}>
          <RefreshCwIcon size={16} />
        </Button>
      )}
    </header>
  );
}
