'use client';
import { QUERY_KEY } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';

import useTranslation from '@src/modules/i18n/client';
import { LanguageType } from '@src/modules/i18n';
import { Button } from '@src/components/ui/button';
import { useToast } from '@src/hooks/use-toast';
import { RefreshCwIcon } from 'lucide-react';
import { setLocalStorageTrue } from '@extension/shared/modules/local-storage';
import { driverObj } from '@src/modules/guide';

interface RefreshButtonProps extends LanguageType {}

export default function RefreshButton({ lng }: RefreshButtonProps) {
  const { t } = useTranslation(lng);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRefreshClick = async () => {
    driverObj.moveNext();
    setLocalStorageTrue('guide');

    await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    toast({ title: t('toastMessage.refresh') });
  };

  return (
    <Button size="icon" variant="outline" id="refresh" onClick={handleRefreshClick}>
      <RefreshCwIcon size={16} />
    </Button>
  );
}
