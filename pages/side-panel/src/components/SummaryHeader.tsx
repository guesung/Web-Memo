import { useUserPreferDarkMode } from '@extension/shared/hooks';
import Option from '../../public/svgs/option.svg';
import { useSummaryContext } from './SummaryProvider';
import RefreshIcon from '../../public/svgs/refresh.svg';
import { Loading } from '@extension/ui';

export default function Header() {
  const { isSummaryLoading, refetchSummary } = useSummaryContext();
  const { isUserPreferDarkMode } = useUserPreferDarkMode();

  const handleOptionClick = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <header className="float-right mt-4 flex items-center gap-1">
      {isSummaryLoading ? (
        <Loading />
      ) : (
        <RefreshIcon
          width="20px"
          height="20px"
          onClick={refetchSummary}
          cursor="pointer"
          fill={isUserPreferDarkMode ? 'black' : 'white'}
        />
      )}

      <Option width="24px" height="24px" onClick={handleOptionClick} fill={isUserPreferDarkMode ? 'black' : 'white'} />
    </header>
  );
}
