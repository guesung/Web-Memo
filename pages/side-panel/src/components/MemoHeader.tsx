import { useDidMount, useTabQuery, useUserPreferDarkMode } from '@extension/shared/hooks';
import { TopRightArrow } from '../icons';
import { WEB_URL } from '@extension/shared/constants';
import { I18n, responseUpdateSidePanel, Tab } from '@extension/shared/utils/extension';

export default function MemoHeader() {
  const { data: tab, refetch: refetchTab } = useTabQuery();
  const { isUserPreferDarkMode } = useUserPreferDarkMode();
  const handleMemoClick = () => {
    Tab.create({ url: `${WEB_URL}/memos` });
  };

  useDidMount(() =>
    responseUpdateSidePanel(() => {
      refetchTab();
    }),
  );

  return (
    <div className="label">
      <span className="label-text whitespace-nowrap font-bold">{I18n.get('memo')}</span>
      <span className="w-1" />
      <TopRightArrow
        width={20}
        height={20}
        fill={isUserPreferDarkMode ? 'black' : 'white'}
        onClick={handleMemoClick}
        className="cursor-pointer"
      />
      <span className="w-4" />
      <span className="label-text w-full truncate text-right">{tab?.title}</span>
    </div>
  );
}
