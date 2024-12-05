import { QUERY_KEY, STORAGE_OPTION_LANGUAGE } from '@src/constants';
import { Storage } from '@src/utils/extension';
import { useSuspenseQuery } from '@tanstack/react-query';

export default function useOptionQuery() {
  return useSuspenseQuery({
    queryFn: () => Storage.get(STORAGE_OPTION_LANGUAGE),
    queryKey: QUERY_KEY.option(),
  });
}
