import { useCallback, useEffect, useRef, useState } from 'react';
import { I18n } from '../bridge/shared';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData> | TData;
  defaultValue?: TData;
}

type StatusType = 'pending' | 'success' | 'rejected';

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData | undefined>(defaultValue);
  const [status, setStatus] = useState<StatusType>('pending');
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    if (abortControllerRef.current) {
      // 이미 동일한 요청이 있다면 취소한다
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    try {
      const data = await fetchFn();
      if (!abortController.signal.aborted) {
        setData(data);
        setStatus('success');
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        setStatus('rejected');
        setError(e instanceof Error ? e : new Error(I18n.get('toast_error_common')));
      }
    } finally {
      abortControllerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetch]);

  if (status === 'rejected' && error) throw error;
  return { data, error, refetch: fetch, status, isLoading: status === 'pending' };
}
