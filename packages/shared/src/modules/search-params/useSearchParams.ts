'use client';

import { usePathname, useSearchParams as useSearchParamsNext } from 'next/navigation';

import type { SearchParamType } from '.';
import { SearchParams } from '.';

export default function useSearchParams() {
  const searchParams = useSearchParamsNext();
  const pathname = usePathname();

  const searchParam = new SearchParams([...searchParams.entries()] as SearchParamType[]);
  const getUrl = () => `${pathname}${searchParam.getSearchParams()}`;

  return {
    ...searchParam,
    getUrl,
  };
}
