'use client';

import { useMemosQuery } from '@extension/shared/hooks';
import type { SearchParamViewType } from '@extension/shared/modules/search-params';
import { Input } from '@src/components/ui';
import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';
import { getChoseong } from 'es-hangul';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import MemoCalendar from './MemoCalendar';
import MemoGrid from './MemoGrid';
import ToggleView from './ToggleView';

interface MemoViewProps extends LanguageType {
  isWish?: string;
  category?: string;
  view?: SearchParamViewType;
}

interface SearchFormValues {
  searchQuery: string;
}

export default function MemoView({ lng, isWish = '', category = '', view = 'grid' }: MemoViewProps) {
  const { t } = useTranslation(lng);
  const { register, watch } = useForm<SearchFormValues>({
    defaultValues: {
      searchQuery: '',
    },
  });
  const searchQuery = watch('searchQuery');
  const { memos } = useMemosQuery();

  useGuide({ lng });

  const filteredMemos = memos
    ?.filter(memo => !!isWish === !!memo.isWish)
    .filter(memo => (category ? memo.category?.name === category : true))
    .filter(memo => {
      if (!searchQuery) return true;

      const searchLower = searchQuery.toLowerCase();
      return (
        memo.title?.toLowerCase().includes(searchLower) ||
        memo.memo?.toLowerCase().includes(searchLower) ||
        memo.category?.name.toLowerCase().includes(searchLower) ||
        getChoseong(memo.title).includes(searchQuery) ||
        getChoseong(memo.memo).includes(searchQuery)
      );
    });

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {category && `${category} | `}
          {t('memos.totalMemos', { total: filteredMemos.length })}
        </p>
        <ToggleView lng={lng} />
      </div>
      <Input type="text" placeholder={t('memos.searchPlaceholder')} className="max-w-sm" {...register('searchQuery')} />
      {view === 'calendar' ? (
        <MemoCalendar lng={lng} memos={filteredMemos} />
      ) : (
        <MemoGrid memos={filteredMemos} gridKey={category + isWish} lng={lng} />
      )}
    </div>
  );
}
