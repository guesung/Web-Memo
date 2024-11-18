import { NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface Option extends NavigateOptions {
  removeOthers?: boolean;
}

export default function useSearchParamsRouter(targetKey: string) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const get = () => {
    return searchParams.get(targetKey) ?? '';
  };

  const set = (value: string, options?: Option) => {
    const currentSearchParams = [...searchParams.entries()]
      .filter(([key]) => (options?.removeOthers ? false : targetKey !== key))
      .concat([[targetKey, value]])
      .reduce((prev, [key, value], index) => {
        if (index === 0) prev += '?';
        else prev += '&';

        return (prev += `${key}=${value}`);
      }, '');

    router.replace(`${pathname}${currentSearchParams}`, { scroll: options?.scroll ?? false });
  };

  const add = (value: string, options?: Option) => {
    const currentSearchParams = [...searchParams.entries(), [targetKey, value]].reduce((prev, [key, value], index) => {
      if (index === 0) prev += '?';
      else prev += '&';

      return (prev += `${key}=${value}`);
    }, '');

    router.replace(`${pathname}${currentSearchParams}`, { scroll: options?.scroll ?? false });
  };

  const remove = (options?: Option) => {
    const currentSearchParams = [...searchParams.entries()]
      .filter(([key]) => targetKey !== key)
      .reduce((prev, [key, value], index) => {
        if (index === 0) prev += '?';
        else prev += '&';

        return (prev += `${key}=${value}`);
      }, '');

    router.replace(`${pathname}${currentSearchParams}`, { scroll: options?.scroll ?? false });
  };

  return {
    set,
    get,
    add,
    remove,
  };
}
