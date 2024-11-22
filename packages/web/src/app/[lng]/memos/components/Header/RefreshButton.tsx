'use client';
import { QUERY_KEY } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';

import useTranslation from '@src/app/i18n/client';
import { LanguageType } from '@src/app/i18n/type';
import { Button } from '@src/components/ui/button';
import { useToast } from '@src/hooks/use-toast';
import { RefreshCwIcon } from 'lucide-react';
import { driverObj } from '../../utils';
import { LOCAL_STORAGE } from '@src/constants';

interface RefreshButtonProps extends LanguageType {}

export default function RefreshButton({ lng }: RefreshButtonProps) {
  const { t } = useTranslation(lng);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefreshClick = async () => {
    driverObj.moveNext();
    window.localStorage.setItem(LOCAL_STORAGE.guide, 'true');

    await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    toast({ title: t('toastMessage.refresh') });
  };

  return (
    <Button size="icon" variant="outline" id="refresh" onClick={handleRefreshClick}>
      <RefreshCwIcon size={16} />
    </Button>
  );
}
