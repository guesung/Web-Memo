import { WEB_URL } from '@extension/shared/constants';
import { useDidMount, useTabQuery } from '@extension/shared/hooks';
import { I18n, responseUpdateSidePanel, Tab } from '@extension/shared/utils/extension';
import { ExternalLinkIcon } from 'lucide-react';

export default function MemoHeader() {
  const { data: tab, refetch: refetchTab } = useTabQuery();
  const handleMemoClick = () => {
    Tab.create({ url: `${WEB_URL}/memos` });
  };

  useDidMount(() =>
    responseUpdateSidePanel(() => {
      refetchTab();
    }),
  );

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-1">
        <span className="whitespace-nowrap font-bold">{I18n.get('memo')}</span>
        <ExternalLinkIcon size={16} onClick={handleMemoClick} role="button" />
      </div>
      <span className="w-4" />
      <span className="w-full truncate text-right">{tab?.title}</span>
    </div>
  );
}
