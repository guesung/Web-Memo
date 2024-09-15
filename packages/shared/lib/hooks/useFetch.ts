import { useCallback, useEffect, useRef, useState } from 'react';
import { I18n } from '../bridge/shared';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData>;
  defaultValue?: TData;
}

type StatusType = 'loading' | 'success' | 'rejected' | 'aborted';

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData | undefined>(defaultValue);
  const [status, setStatus] = useState<StatusType>('loading');
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    if (abortControllerRef.current) {
      // NOTE: 이미 동일한 요청이 있다면 취소한다
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    try {
      const data = await fetchFn();
      if (abortController.signal.aborted) {
        setStatus('aborted');
        return;
      }

      setData(data);
      setStatus('success');
    } catch (e) {
      if (abortController.signal.aborted) {
        setStatus('aborted');
        return;
      }
      setStatus('rejected');
      setError(e instanceof Error ? e : new Error(I18n.get('toast_error_common')));
    } finally {
      abortControllerRef.current = null;
    }
  }, [fetchFn]);

  useEffect(() => {
    fetch();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'rejected' && error) throw error;
  return { data, error, refetch: fetch, status, isLoading: status === 'loading' };
}
