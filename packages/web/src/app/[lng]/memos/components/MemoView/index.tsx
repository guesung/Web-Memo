'use client';

import { useMemosQuery } from '@extension/shared/hooks';
import type { SearchParamViewType } from '@extension/shared/modules/search-params';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@extension/ui';
import { Input } from '@src/components/ui';
import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';
import { getChoseong } from 'es-hangul';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import RefreshButton from '../Header/RefreshButton';
import MemoCalendar from './MemoCalendar';
import MemoGrid from './MemoGrid';
import ToggleView from './ToggleView';

interface MemoViewProps extends LanguageType {
  isWish?: string;
  category?: string;
  view?: SearchParamViewType;
}

type SearchTargetType = 'all' | 'title' | 'memo';
interface SearchFormValues {
  searchQuery: string;
  searchTarget: SearchTargetType;
}

export default function MemoView({ lng, isWish = '', category = '', view = 'grid' }: MemoViewProps) {
  const { t } = useTranslation(lng);
  const { register, watch, control } = useForm<SearchFormValues>({
    defaultValues: {
      searchQuery: '',
      searchTarget: 'all',
    },
  });
  const { memos } = useMemosQuery();

  useGuide({ lng });

  const filteredMemos = memos
    ?.filter(memo => !!isWish === !!memo.isWish)
    .filter(memo => (category ? memo.category?.name === category : true))
    .filter(memo => {
      if (!watch('searchQuery')) return true;

      const searchLower = watch('searchQuery').toLowerCase();
      const isTitleMatch =
        memo.title?.toLowerCase().includes(searchLower) || getChoseong(memo.title).includes(watch('searchQuery'));
      const isMemoMatch =
        memo.memo?.toLowerCase().includes(searchLower) || getChoseong(memo.memo).includes(watch('searchQuery'));
      const isCategoryMatch = memo.category?.name.toLowerCase().includes(searchLower);

      if (isCategoryMatch) return true;
      if (watch('searchTarget') === 'title') return isTitleMatch;
      if (watch('searchTarget') === 'memo') return isMemoMatch;
      return isTitleMatch || isMemoMatch;
    });

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center">
        <div className="flex w-full items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {category && `${category} | `}
            {t('memos.totalMemos', { total: filteredMemos.length })}
          </p>
          <div className="flex">
            <RefreshButton lng={lng} />
            <ToggleView lng={lng} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4">
        <Input
          type="text"
          placeholder={t('memos.searchPlaceholder')}
          className="max-w-sm"
          {...register('searchQuery')}
        />
        <Controller
          name="searchTarget"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('memos.searchTarget.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('memos.searchTarget.all')}</SelectItem>
                <SelectItem value="title">{t('memos.searchTarget.title')}</SelectItem>
                <SelectItem value="memo">{t('memos.searchTarget.memo')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      {view === 'calendar' ? (
        <MemoCalendar lng={lng} memos={filteredMemos} />
      ) : (
        <MemoGrid memos={filteredMemos} gridKey={category + isWish} lng={lng} />
      )}
    </div>
  );
}
