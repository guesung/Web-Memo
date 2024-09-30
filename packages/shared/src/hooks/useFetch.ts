import { I18n } from '@src/utils/extension';
import { useCallback, useState } from 'react';
import useDidMount from './useDidMount';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData>;
  defaultValue?: TData;
}

type StatusType = 'loading' | 'success' | 'rejected' | 'aborted';

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData | undefined>(defaultValue);
  const [status, setStatus] = useState<StatusType>('loading');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setStatus('loading');
      const data = await fetchFn();

      setData(data);
      setStatus('success');
    } catch (e) {
      setStatus('rejected');
      setError(e instanceof Error ? e : new Error(I18n.get('toast_error_common')));
    }
  }, [fetchFn, status]);

  useDidMount(fetch);

  if (status === 'rejected' && error) throw error;
  return { data, error, refetch: fetch, status, isLoading: status === 'loading' };
}
