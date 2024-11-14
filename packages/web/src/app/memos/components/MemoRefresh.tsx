'use client';
import { queryKeys } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';

import { HTMLMotionProps, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { driverObj } from '../utils';
import Image from 'next/image';

interface MemoRefreshProps extends HTMLMotionProps<'div'> {}

export default function MemoRefresh({ ...props }: MemoRefreshProps) {
  const queryClient = useQueryClient();
  const handleClick = async () => {
    driverObj.moveNext();
    window.localStorage.setItem('IS_USER_SEEN_GUIDE', 'true');

    await queryClient.invalidateQueries({ queryKey: queryKeys.memoList() });
    toast.success('새로고침이 완료되었습니다.');
  };

  return (
    <motion.div onClick={handleClick} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} {...props}>
      <Image src="/images/svgs/refresh.svg" alt="refresh" width={16} height={16} />
    </motion.div>
  );
}
