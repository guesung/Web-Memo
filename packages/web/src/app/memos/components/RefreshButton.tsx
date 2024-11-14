'use client';
import { queryKeys } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';

import { HTMLMotionProps, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { driverObj } from '../utils';
import Image from 'next/image';
import { IS_USER_SEEN_GUIDE } from '../constants';

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
    <motion.button
      onClick={handleRefreshClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      id="refresh"
      className="btn btn-circle btn-sm"
      {...props}>
      <Image src="/images/svgs/refresh.svg" color="gray" alt="refresh" width={16} height={16} />
    </motion.button>
  );
}