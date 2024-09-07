import { useCallback, useState } from 'react';
import useDidMount from './useDidMount';
import { I18n } from '../bridge/shared';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData> | TData;
  defaultValue?: TData | undefined;
}

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData | undefined>(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchFn();
      setData(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(I18n.get('error_common')));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  useDidMount(fetch);

  if (error) throw error;
  return { data, isLoading, error, refetch: fetch };
}
