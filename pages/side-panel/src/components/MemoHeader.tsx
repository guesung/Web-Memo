import { WEB_URL } from '@extension/shared/constants';
import { useDidMount, useTabQuery, useUserPreferDarkMode } from '@extension/shared/hooks';
import { I18n, responseUpdateSidePanel, Tab } from '@extension/shared/utils/extension';
import Plus from '../../public/svgs/plus.svg';
import TopRightArrow from '../../public/svgs/top_right_arrow.svg';

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
      <Plus width={20} height={20} className="cursor-pointer" fill={isUserPreferDarkMode ? 'black' : 'white'} />
      <span className="w-4" />
      <span className="label-text w-full truncate text-right">{tab?.title}</span>
    </div>
  );
}
