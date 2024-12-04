'use client';
import { QUERY_KEY } from '@extension/shared/constants';
import { setLocalStorageTrue } from '@extension/shared/modules/local-storage';
import { Button } from '@src/components/ui';
import { useToast } from '@src/hooks/use-toast';
import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCwIcon } from 'lucide-react';

interface RefreshButtonProps extends LanguageType {}

export default function RefreshButton({ lng }: RefreshButtonProps) {
  const { t } = useTranslation(lng);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { driverObj } = useGuide({ lng });

  const handleRefreshClick = async () => {
    driverObj.moveNext();
    setLocalStorageTrue('guide');

    await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    toast({ title: t('toastTitle.refresh') });
  };

  return (
    <Button size="icon" variant="outline" id="refresh" onClick={handleRefreshClick}>
      <RefreshCwIcon size={16} />
    </Button>
  );
}
