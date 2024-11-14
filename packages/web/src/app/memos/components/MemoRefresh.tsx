'use client';
import { queryKeys } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { toast } from 'react-toastify';
import { motion, SVGMotionProps } from 'framer-motion';
import { driverObj } from '../utils';

interface MemoRefreshProps extends SVGMotionProps<SVGSVGElement> {}
export default function MemoRefresh({ ...props }: MemoRefreshProps) {
  const queryClient = useQueryClient();
  const handleClick = async () => {
    driverObj.moveNext();
    window.localStorage.setItem('IS_USER_SEEN_GUIDE', 'true');

    await queryClient.invalidateQueries({ queryKey: queryKeys.memoList() });
    toast.success('새로고침이 완료되었습니다.');
  };

  return (
    <motion.svg
      width="current"
      height="current"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={handleClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      {...props}>
      <path
        d="M21 3V8M21 8H16M21 8L18 5.29168C16.4077 3.86656 14.3051 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.2832 21 19.8675 18.008 20.777 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}
