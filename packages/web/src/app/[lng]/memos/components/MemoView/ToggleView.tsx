'use client';
import { SearchParamViewType, useSearchParams } from '@extension/shared/modules/search-params';
import { ToggleGroup, ToggleGroupItem } from '@src/components/ui/toggle-group';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { Calendar, Grid } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ToggleViewProps extends LanguageType {
  view: SearchParamViewType;
}

export default function ToggleView({ view, lng }: ToggleViewProps) {
  const { t } = useTranslation(lng);
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleViewChange = (value: string) => {
    searchParams.set('view', value);
    router.replace(searchParams.getUrl(), { scroll: false });
  };

  return (
    <ToggleGroup type="single" value={view} onValueChange={handleViewChange}>
      <ToggleGroupItem value="grid" aria-label={t('memos.grid')}>
        <Grid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="calendar" aria-label={t('memos.calendar')}>
        <Calendar className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
