import { queryKeys } from '@extension/shared/constants';
import { Tab } from '@extension/shared/utils/extension';
import { useQuery } from '@tanstack/react-query';

export default function useTabQuery() {
  const query = useQuery({ queryFn: Tab.get, queryKey: queryKeys.tab() });

  return query;
}
