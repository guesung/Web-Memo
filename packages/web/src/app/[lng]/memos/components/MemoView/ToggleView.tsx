'use client';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { ToggleGroup, ToggleGroupItem } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { Calendar, Grid } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ToggleViewProps extends LanguageType {}

export default function ToggleView({ lng }: ToggleViewProps) {
  const { t } = useTranslation(lng);
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleViewChange = (value: string) => {
    if (!value) return;

    searchParams.set('view', value);
    router.replace(searchParams.getUrl(), { scroll: false });
  };

  return (
    <ToggleGroup type="single" onValueChange={handleViewChange}>
      <ToggleGroupItem value="grid" aria-label={t('memos.grid')}>
        <Grid size={16} />
      </ToggleGroupItem>
      <ToggleGroupItem value="calendar" aria-label={t('memos.calendar')}>
        <Calendar size={16} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
