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

import MemoCalendar from './MemoCalendar';
import MemoGrid from './MemoGrid';
import ToggleView from './ToggleView';

type SearchTarget = 'all' | 'title' | 'memo';

interface MemoViewProps extends LanguageType {
  isWish?: string;
  category?: string;
  view?: SearchParamViewType;
}

interface SearchFormValues {
  searchQuery: string;
  searchTarget: SearchTarget;
}

export default function MemoView({ lng, isWish = '', category = '', view = 'grid' }: MemoViewProps) {
  const { t } = useTranslation(lng);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, watch, control } = useForm<SearchFormValues>({
    defaultValues: {
      searchQuery: searchParams.get('query'),
      searchTarget: (searchParams.get('searchTarget') as SearchTarget) || 'all',
    },
  });
  const searchQuery = watch('searchQuery');
  const searchTarget = watch('searchTarget');
  const { memos } = useMemosQuery();

  useGuide({ lng });

  useEffect(() => {
    if (searchQuery) {
      searchParams.set('query', searchQuery);
    } else {
      searchParams.removeAll('query');
    }
    searchParams.set('searchTarget', searchTarget);
    router.replace(searchParams.getUrl());
  }, [searchQuery, searchTarget, searchParams, router]);

  const filteredMemos = memos
    ?.filter(memo => !!isWish === !!memo.isWish)
    .filter(memo => (category ? memo.category?.name === category : true))
    .filter(memo => {
      if (!searchQuery) return true;

      const searchLower = searchQuery.toLowerCase();
      const matchTitle =
        memo.title?.toLowerCase().includes(searchLower) || getChoseong(memo.title).includes(searchQuery);
      const matchMemo = memo.memo?.toLowerCase().includes(searchLower) || getChoseong(memo.memo).includes(searchQuery);
      const matchCategory = memo.category?.name.toLowerCase().includes(searchLower);

      switch (searchTarget) {
        case 'title':
          return matchTitle || matchCategory;
        case 'memo':
          return matchMemo || matchCategory;
        default:
          return matchTitle || matchMemo || matchCategory;
      }
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
      <div className="flex items-center gap-4">
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
