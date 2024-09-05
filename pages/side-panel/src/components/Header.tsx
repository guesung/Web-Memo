import { Option, Refresh } from '../icons';
import { useSummaryContext } from './SummaryProvider';

export default function Header() {
  const { isSummaryLoading, refetchSummary } = useSummaryContext();

  const handleOption = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="absolute right-4 top-4 flex gap-1 items-center">
      <Refresh width="20px" height="20px" isLoading={isSummaryLoading} onRefresh={refetchSummary} />
      <Option width="24px" height="24px" onOption={handleOption} />
    </div>
  );
}
