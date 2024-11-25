import { useDidMount, useMemoQuery } from '@extension/shared/hooks';
import { useSupabaseClientQuery, useTabQuery } from '@extension/shared/hooks/extension';
import { I18n, responseUpdateSidePanel, Tab } from '@extension/shared/utils/extension';
import { getMemoUrl } from '@src/utils';
import { ExternalLinkIcon } from 'lucide-react';

export default function MemoHeader() {
  const { data: tab, refetch: refetchTab } = useTabQuery();
  const { data: supabaseClient } = useSupabaseClientQuery();

  const { memo: memoData } = useMemoQuery({
    supabaseClient,
    url: tab.url,
  });

  const handleMemoClick = () => {
    const memoUrl = getMemoUrl(memoData?.id);

    Tab.create({ url: memoUrl });
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
        <ExternalLinkIcon
          size={16}
          onClick={handleMemoClick}
          role="button"
          tabIndex={0}
          aria-label="새 탭 열기"
          onKeyDown={e => e.key === 'Enter' && handleMemoClick()}
        />
      </div>
      <span className="w-4" />
      <span className="w-full truncate text-right" title={String(tab?.index)}>
        {tab?.title}
      </span>
    </div>
  );
}
