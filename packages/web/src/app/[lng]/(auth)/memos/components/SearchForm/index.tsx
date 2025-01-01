'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@extension/ui';
import { Input } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { Control, Controller, useFormContext } from 'react-hook-form';
import { SearchFormValues } from '../SearchFormProvider';

interface SearchFormProps extends LanguageType {}

export default function SearchForm({ lng }: SearchFormProps) {
  const { t } = useTranslation(lng);
  const { control } = useFormContext<SearchFormValues>();

  return (
    <form className="flex items-center justify-center gap-4" onSubmit={e => e.preventDefault()}>
      <Controller
        name="searchQuery"
        control={control}
        render={({ field }) => (
          <Input type="text" placeholder={t('memos.searchPlaceholder')} className="max-w-sm" {...field} />
        )}
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
    </form>
  );
}
