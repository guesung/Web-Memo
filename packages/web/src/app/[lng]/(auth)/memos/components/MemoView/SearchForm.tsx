import { LanguageType } from '@src/modules/i18n';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Control, Controller, useForm } from 'react-hook-form';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@extension/ui';
import { Input } from '@src/components/ui';
import useTranslation from '@src/modules/i18n/client';
import { SearchFormValues } from '../SearchFormProvider';

interface SearchFormProps extends LanguageType {
  control: Control<SearchFormValues, any>;
}
export default function SearchForm({ lng, control }: SearchFormProps) {
  const { t } = useTranslation(lng);

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
