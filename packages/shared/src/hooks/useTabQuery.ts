import { queryKeys } from '@src/constants';
import { Tab } from '@src/utils/extension';
import { useQuery } from '@tanstack/react-query';

export default function useTabQuery() {
  return useQuery({ queryFn: Tab.get, queryKey: queryKeys.tab() });
}
