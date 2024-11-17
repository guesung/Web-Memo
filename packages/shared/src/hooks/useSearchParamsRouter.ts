import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function useSearchParamsRouter(targetKey: string) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const get = () => {
    return searchParams.get(targetKey) ?? '';
  };

  const set = (value: string) => {
    const currentSearchParams = [...searchParams.entries()]
      .filter(([key]) => targetKey !== key)
      .concat([[targetKey, value]])
      .reduce((prev, [key, value], index) => {
        if (index === 0) prev += '?';
        else prev += '&';

        return (prev += `${key}=${value}`);
      }, '');

    console.log([...searchParams.entries()].filter(([key]) => targetKey !== key).concat([targetKey, value]));

    router.replace(`${pathname}${currentSearchParams}`, { scroll: false });
  };

  const add = (value: string) => {
    const currentSearchParams = [...searchParams.entries(), [targetKey, value]].reduce((prev, [key, value], index) => {
      if (index === 0) prev += '?';
      else prev += '&';

      return (prev += `${key}=${value}`);
    }, '');

    router.replace(`${pathname}${currentSearchParams}`, { scroll: false });
  };

  const remove = () => {
    const currentSearchParams = [...searchParams.entries()]
      .filter(([key]) => targetKey !== key)
      .reduce((prev, [key, value], index) => {
        if (index === 0) prev += '?';
        else prev += '&';

        return (prev += `${key}=${value}`);
      }, '');

    router.replace(`${pathname}${currentSearchParams}`, { scroll: false });
  };

  return {
    set,
    get,
    add,
    remove,
  };
}
