import { SearchParams } from '@src/utils';
import { usePathname, useSearchParams } from 'next/navigation';

const searchParamsKeys = ['id', 'isWish', 'category'] as const;

export type SearchParamKeyType = (typeof searchParamsKeys)[number];
export type SearchParamValueType = string;
export type SearchParamType = [SearchParamKeyType, SearchParamValueType];

export default function useSearchParamsSafe() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const searchParam = new SearchParams([...searchParams.entries()] as SearchParamType[]);
  const getUrl = () => `${pathname}${searchParam.getSearchParams()}`;

  return {
    ...searchParam,
    getUrl,
  };
}
