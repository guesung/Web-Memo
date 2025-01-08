'use client';

import { useMemosQuery } from '@extension/shared/hooks';
import type { SearchParamsType, SearchParamViewType } from '@extension/shared/modules/search-params';

import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';

import { useTranslation } from 'react-i18next';

import { useFormContext } from 'react-hook-form';
import RefreshButton from '../Header/RefreshButton';
import { SearchFormValues } from '../SearchFormProvider';
import MemoCalendar from './MemoCalendar';
import MemoGrid from './MemoGrid';
import ToggleView from './ToggleView';

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
    category: category,
    isWish: isWish,
    searchQuery: watch('searchQuery'),
    searchTarget: watch('searchTarget'),
  });

  useGuide({ lng });

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center">
        <div className="flex w-full items-center justify-between">
          <p className="text-muted-foreground text-sm">{t('memos.totalMemos', { total: memos.length })}</p>
          <div className="flex">
            <RefreshButton lng={lng} />
            <ToggleView lng={lng} />
          </div>
        </div>
      </div>

      {view === 'grid' && <MemoGrid memos={memos} gridKey={category + isWish} lng={lng} id={id} />}
      {view === 'calendar' && <MemoCalendar lng={lng} memos={memos} />}
    </div>
  );
}