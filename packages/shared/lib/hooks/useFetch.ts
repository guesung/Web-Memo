import { useCallback, useState } from 'react';
import useDidMount from './useDidMount';
import { I18n } from '../bridge/shared';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData> | TData;
  defaultValue?: TData | undefined;
}

type StatusType = 'pending' | 'success' | 'rejected';

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData | undefined>(defaultValue);
  const [status, setStatus] = useState<StatusType>('pending');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await fetchFn();
      setData(data);
      setStatus('success');
    } catch (e) {
      setStatus('rejected');
      setError(e instanceof Error ? e : new Error(I18n.get('toast_error_common')));
    }
  }, [fetchFn]);

  useDidMount(fetch);

  if (status === 'rejected' && error) throw error;
  return { data, error, refetch: fetch, status, isLoading: status === 'pending' };
}
