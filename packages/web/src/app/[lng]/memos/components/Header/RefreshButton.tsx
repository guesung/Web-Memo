'use client';
import { QUERY_KEY } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@src/components/ui/button';
import { useToast } from '@src/hooks/use-toast';
import { HTMLMotionProps } from 'framer-motion';
import { RefreshCwIcon } from 'lucide-react';
import { IS_USER_SEEN_GUIDE } from '../../constants';
import { driverObj } from '../../utils';
import { LanguageType } from '@src/app/i18n/type';
import useTranslation from '@src/app/i18n/client';

interface RefreshButtonProps extends LanguageType {}

export default function RefreshButton({ lng }: RefreshButtonProps) {
  const { t } = useTranslation(lng);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefreshClick = async () => {
    driverObj.moveNext();
    window.localStorage.setItem(IS_USER_SEEN_GUIDE, 'true');

    await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    toast({ title: t('toastMessage.refresh') });
  };

  return (
    <Button size="icon" variant="outline" id="refresh" onClick={handleRefreshClick}>
      <RefreshCwIcon size={16} />
    </Button>
  );
}