import { useUserPreferDarkMode } from '@extension/shared/hooks';
import { Option, Refresh } from '../icons';
import { useSummaryContext } from './SummaryProvider';

export default function Header() {
  const { isSummaryLoading, refetchSummary } = useSummaryContext();
  const { isUserPreferDarkMode } = useUserPreferDarkMode();

  const handleOptionClick = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <header className="float-right mt-4 flex items-center gap-1">
      <Refresh
        width="20px"
        height="20px"
        isLoading={isSummaryLoading}
        onRefresh={refetchSummary}
        fill={isUserPreferDarkMode ? 'black' : 'white'}
      />
      <Option width="24px" height="24px" onOption={handleOptionClick} fill={isUserPreferDarkMode ? 'black' : 'white'} />
    </header>
  );
}
