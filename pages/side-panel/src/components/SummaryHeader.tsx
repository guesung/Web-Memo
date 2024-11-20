import { Loading } from '@extension/ui';
import { RefreshCwIcon, SettingsIcon } from 'lucide-react';
import { useSummaryContext } from './SummaryProvider';

export default function Header() {
  const { isSummaryLoading, refetchSummary } = useSummaryContext();

  const handleOptionClick = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <header className="float-right mt-4 flex items-center gap-1">
      {isSummaryLoading ? <Loading /> : <RefreshCwIcon size={16} onClick={refetchSummary} role="button" />}
      <SettingsIcon size={16} onClick={handleOptionClick} role="button" />
    </header>
  );
}
