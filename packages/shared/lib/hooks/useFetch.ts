import { useState } from 'react';
import useDidMount from './useDidMount';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData> | TData;
  defaultValue?: TData;
}

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData>(defaultValue ?? ({} as TData));
  const [isLoading, setIsLoading] = useState(true);

  useDidMount(async () => {
    const data = await fetchFn();
    setData(data);
    setIsLoading(false);
  });

  return { data, isLoading };
}
