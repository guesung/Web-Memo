'use client';
import { queryKeys } from '@extension/shared/constants';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

interface MemoRefreshProps extends React.SVGProps<SVGSVGElement> {}
export default function MemoRefresh({ ...props }: MemoRefreshProps) {
  const queryClient = useQueryClient();
  const handleClick = async () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.memoList() });
  };

  return (
    <svg
      width="current"
      height="current"
      viewBox="0 0 24 24"
      fill="current"
      xmlns="http://www.w3.org/2000/svg"
      cursor="pointer"
      onClick={handleClick}
      {...props}>
      <path
        d="M4.06189 13C4.02104 12.6724 4 12.3387 4 12C4 7.58172 7.58172 4 12 4C14.5006 4 16.7332 5.14727 18.2002 6.94416M19.9381 11C19.979 11.3276 20 11.6613 20 12C20 16.4183 16.4183 20 12 20C9.61061 20 7.46589 18.9525 6 17.2916M9 17H6V17.2916M18.2002 4V6.94416M18.2002 6.94416V6.99993L15.2002 7M6 20V17.2916"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}