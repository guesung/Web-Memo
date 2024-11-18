'use client';
import { queryKeys } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@src/components/ui/button';
import { useToast } from '@src/hooks/use-toast';
import { HTMLMotionProps } from 'framer-motion';
import { RefreshCwIcon } from 'lucide-react';
import { IS_USER_SEEN_GUIDE } from '../../constants';
import { driverObj } from '../../utils';

export default function RefreshButton() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefreshClick = async () => {
    driverObj.moveNext();
    window.localStorage.setItem(IS_USER_SEEN_GUIDE, 'true');

    await queryClient.invalidateQueries({ queryKey: queryKeys.memos() });
    toast({ title: '새로고침이 완료되었습니다.' });
  };

  return (
    <Button size="icon" variant="outline" id="refresh" onClick={handleRefreshClick}>
      <RefreshCwIcon size={16} />
    </Button>
  );
}
