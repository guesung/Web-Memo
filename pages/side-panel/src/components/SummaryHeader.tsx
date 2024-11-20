import { Button, Loading } from '@extension/ui';
import { RefreshCwIcon } from 'lucide-react';
import { useSummaryContext } from './SummaryProvider';
import ToggleTheme from './ToggleTheme';

export default function Header() {
  const { isSummaryLoading, refetchSummary } = useSummaryContext();

  return (
    <header className="float-right mt-4 flex items-center gap-1">
      <ToggleTheme />
      {isSummaryLoading ? (
        <Button variant="outline" size="icon">
          <Loading />
        </Button>
      ) : (
        <Button variant="outline" size="icon" onClick={refetchSummary}>
          <RefreshCwIcon size={16} />
        </Button>
      )}
    </header>
  );
}
