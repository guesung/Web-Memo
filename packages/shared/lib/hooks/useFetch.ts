import { useState } from 'react';
import useDidMount from './useDidMount';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData> | TData;
  defaultValue?: TData;
}

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData>(defaultValue ?? ({} as TData));
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useDidMount(async () => {
    try {
      const data = await fetchFn();
      setData(data);
    } catch (e) {
      setIsError(true);
    }
    setIsLoading(false);
  });

  if (isError) throw new Error('Error in useFetch');
  return { data, isLoading, isError };
}
