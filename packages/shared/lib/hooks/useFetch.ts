import { useCallback, useState } from 'react';
import useDidMount from './useDidMount';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData> | TData;
  defaultValue?: TData | undefined;
}

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData>(defaultValue as TData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchFn();
      setData(data);
    } catch (e) {
      setError(e);
    }
    setIsLoading(false);
  }, [fetchFn]);

  useDidMount(fetch);

  if (error) throw error;
  return { data, isLoading, error, refetch: fetch };
}
