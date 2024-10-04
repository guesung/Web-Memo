import { STORAGE_OPTION_LANGUAGE } from '@src/constants';
import { Storage } from '@src/utils/extension';
import { useQuery } from '@tanstack/react-query';

export default function useOptionQuery() {
  return useQuery({
    queryFn: () => Storage.get(STORAGE_OPTION_LANGUAGE),
    queryKey: ['option'],
  });
}
