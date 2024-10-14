'use client';
import { queryKeys } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

interface MemoRefreshProps extends React.SVGProps<SVGSVGElement> {}
export default function MemoRefresh({ ...props }: MemoRefreshProps) {
  const queryClient = useQueryClient();
  const handleClick = () => queryClient.invalidateQueries({ queryKey: queryKeys.memoList() });

  return (
    <svg
      width="current"
      height="current"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={handleClick}
      {...props}>
      <path
        d="M21 3V8M21 8H16M21 8L18 5.29168C16.4077 3.86656 14.3051 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.2832 21 19.8675 18.008 20.777 14"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
