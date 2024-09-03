import { useState } from 'react';
import useDidMount from './useDidMount';

interface UseFetchProps<TData> {
  fetchFn: () => Promise<TData>;
  defaultValue?: TData;
}

export default function useFetch<TData>({ fetchFn, defaultValue }: UseFetchProps<TData>) {
  const [data, setData] = useState<TData>(defaultValue ?? ({} as TData));

  useDidMount(async () => {
    const data = await fetchFn();
    setData(data);
  });

  return { data };
}
