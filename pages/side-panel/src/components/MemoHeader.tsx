import { useDidMount, useMemoQuery } from '@extension/shared/hooks';
import { useTabQuery } from '@extension/shared/hooks/extension';
import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';
import { delay } from '@extension/shared/utils';
import { I18n, Tab } from '@extension/shared/utils/extension';
import { Skeleton } from '@extension/ui';
import { getMemoUrl } from '@src/utils';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { ExternalLinkIcon } from 'lucide-react';
import { Suspense } from 'react';

export default function MemoHeader() {
  return (
    <div className="flex items-center">
      <div className="flex items-center gap-1">
        <span className="whitespace-nowrap font-bold">{I18n.get('memo')}</span>
        <Suspense fallback={<ExternalLinkIcon size={16} />}>
          <MemoLink />
        </Suspense>
      </div>
      <span className="w-4" />
      <Suspense fallback={<Skeleton className="ml-auto h-full w-32" />}>
        <TabTitle />
      </Suspense>
    </div>
  );
}

function MemoLink() {
  const { data: tab } = useTabQuery();
  const { memo: memoData } = useMemoQuery({
    url: tab?.url ?? '',
  });

  const handleMemoClick = () => {
    Tab.create({ url: getMemoUrl({ id: memoData?.id, isWish: !!memoData?.isWish }) });
  };

  return (
    <ExternalLinkIcon
      size={16}
      onClick={handleMemoClick}
      role="button"
      tabIndex={0}
      aria-label="새 탭 열기"
      onKeyDown={e => e.key === 'Enter' && handleMemoClick()}
    />
  );
}

function TabTitle() {
  const { data: tab, refetch: refetchTab } = useTabQuery();

  useDidMount(() =>
    ExtensionBridge.responseUpdateSidePanel(() => {
      refetchTab();
    }),
  );

  return (
    <span className="w-full truncate text-right" title={String(tab?.index)}>
      {tab?.title}
    </span>
  );
}
