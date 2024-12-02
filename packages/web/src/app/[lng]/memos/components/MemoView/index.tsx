'use client';

import { useMemosQuery } from '@extension/shared/hooks';
import type { SearchParamViewType } from '@extension/shared/modules/search-params';
import { useSupabaseClient } from '@src/hooks';
import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';
import { useTranslation } from 'react-i18next';

import MemoCalendar from './MemoCalendar';
import MemoGrid from './MemoGrid';
import ToggleView from './ToggleView';

interface MemoViewProps extends LanguageType {
  isWish?: string;
  category?: string;
  view?: SearchParamViewType;
}

export default function MemoView({ lng, isWish = '', category = '', view = 'grid' }: MemoViewProps) {
  const { t } = useTranslation(lng);
  const supabaseClient = useSupabaseClient();

  const { memos } = useMemosQuery({
    supabaseClient,
  });

  useGuide({ lng });

  const filteredMemos = memos
    ?.filter(memo => !!isWish === !!memo.isWish)
    .filter(memo => (category ? memo.category?.name === category : true));

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {category && `${category} | `}
          {t('memos.totalMemos', { total: filteredMemos.length })}
        </p>
        <ToggleView view={view} lng={lng} />
      </div>
      {view === 'calendar' ? (
        <MemoCalendar lng={lng} memos={filteredMemos} />
      ) : (
        <MemoGrid memos={filteredMemos} gridKey={category + isWish} lng={lng} />
      )}
    </div>
  );
}
