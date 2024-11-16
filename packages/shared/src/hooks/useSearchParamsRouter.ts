import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface UseSearchParamsRouterProps {
  targetSearchParams: string;
}

export default function useSearchParamsRouter({ targetSearchParams }: UseSearchParamsRouterProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const get = () => {
    return searchParams.get(targetSearchParams) ?? '';
  };

  const set = (target: string) => {
    router.replace(`${pathname}?${targetSearchParams}=${target}`, { scroll: false });
  };

  const reset = () => {
    router.replace(pathname, { scroll: false });
  };

  return {
    set,
    get,
    reset,
  };
}
