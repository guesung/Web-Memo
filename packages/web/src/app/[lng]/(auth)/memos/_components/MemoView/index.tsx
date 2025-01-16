'use client';

import { useMemosQuery } from '@extension/shared/hooks';
import type { SearchParamsType } from '@extension/shared/modules/search-params';

import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';

import { useTranslation } from 'react-i18next';

import { useFormContext } from 'react-hook-form';

import dynamic from 'next/dynamic';
import { SearchFormValues } from '../SearchFormProvider';
import MemoGrid from './MemoGrid';

const RefreshButton = dynamic(() => import('./RefreshButton'), {
  ssr: false,
});
const ToggleView = dynamic(() => import('./ToggleView'), {
  ssr: false,
});
const MemoCalendar = dynamic(() => import('./MemoCalendar'), {
  ssr: false,
});
const ExtensionDialog = dynamic(() => import('@src/app/_components/ExtensionDialog'), {
  ssr: false,
});

interface MemoViewProps extends LanguageType {
  searchParams: SearchParamsType;
}

export default function MemoView({
  lng,
  searchParams: { category = '', isWish = '', view = 'grid', id },
}: MemoViewProps) {
  const { t } = useTranslation(lng);
  const { watch } = useFormContext<SearchFormValues>();
  const { memos } = useMemosQuery({
    category,
    isWish: isWish === 'true',
    searchQuery: watch('searchQuery'),
    searchTarget: watch('searchTarget'),
  });

  useGuide({ lng });

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center">
        <div className="flex w-full items-center justify-between">
          <p className="text-muted-foreground select-none text-sm">{t('memos.totalMemos', { total: memos.length })}</p>
          <div className="flex">
            <RefreshButton lng={lng} />
            <ToggleView lng={lng} />
          </div>
        </div>
      </div>

      {view === 'grid' && <MemoGrid memos={memos} lng={lng} />}
      {view === 'calendar' && <MemoCalendar lng={lng} memos={memos} />}

      <ExtensionDialog lng={lng} />
    </div>
  );
}
