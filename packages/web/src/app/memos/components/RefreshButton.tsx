'use client';
import { queryKeys } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';

import { HTMLMotionProps, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { driverObj } from '../utils';
import Image from 'next/image';
import { IS_USER_SEEN_GUIDE } from '../constants';
import { Button } from '@src/components/ui/button';

interface RefreshButtonProps extends HTMLMotionProps<'button'> {}

export default function RefreshButton({ ...props }: RefreshButtonProps) {
  const queryClient = useQueryClient();

  const handleRefreshClick = async () => {
    driverObj.moveNext();
    window.localStorage.setItem(IS_USER_SEEN_GUIDE, 'true');

    await queryClient.invalidateQueries({ queryKey: queryKeys.memoList() });
    toast.success('새로고침이 완료되었습니다.');
  };

  return (
    <Button variant="outline" size="icon" id="refresh" onClick={handleRefreshClick}>
      <Image src="/images/svgs/refresh.svg" alt="refresh" width={16} height={16} />
    </Button>
  );
}
