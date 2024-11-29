import { QUERY_KEY, STORAGE_KEYS } from '@src/constants';
import { Storage } from '@src/utils/extension';
import { useQuery } from '@tanstack/react-query';

export default function useOptionQuery() {
  return useQuery({
    queryFn: () => Storage.get(STORAGE_KEYS.language),
    queryKey: QUERY_KEY.option(),
  });
}
