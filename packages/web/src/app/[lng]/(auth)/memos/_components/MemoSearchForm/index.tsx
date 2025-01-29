'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@extension/ui';
import { Input } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import { X } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import { SearchFormValues } from '../MemoSearchFormProvider';

interface MemoSearchFormProps extends LanguageType {}

export default function MemoSearchForm({ lng }: MemoSearchFormProps) {
  const { t } = useTranslation(lng);
  const {
    control,
    reset,
    formState: { isDirty },
  } = useFormContext<SearchFormValues>();

  return (
    <form className="flex items-center justify-center gap-4" onSubmit={e => e.preventDefault()}>
      <Controller
        name="searchQuery"
        control={control}
        render={({ field }) => (
          <div className="relative max-w-sm">
            <Input
              type="text"
              placeholder={t('memos.searchPlaceholder')}
              className="w-full select-none pr-8"
              {...field}
            />
            {isDirty && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => reset()}
                aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      />
      <Controller
        name="searchTarget"
        control={control}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger className="w-[180px] select-none">
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
    </form>
  );
}
