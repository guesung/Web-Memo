import { useCallback, useState } from 'react';

import useDidMount from './useDidMount';
import useError from './useError';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData>;
  defaultValue?: TData;
}

type StatusType = 'loading' | 'success' | 'rejected';

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData | undefined>(defaultValue);
  const [status, setStatus] = useState<StatusType>('loading');
  const { error, setError } = useError();

  const fetch = useCallback(async () => {
    try {
      setStatus('loading');
      // setTimeout(() => {
      //   if (status === 'loading') throw new Error(I18n.get('toast_error_common'));
      // }, 3000);
      const data = await fetchFn();

      setData(data);
      setStatus('success');
    } catch (error) {
      setStatus('rejected');
      setError(error as Error);
    }
  }, [fetchFn, setError]);

  useDidMount(fetch);

  if (status === 'rejected' && error) throw error;
  return { data, error, refetch: fetch, status, isLoading: status === 'loading' };
}
