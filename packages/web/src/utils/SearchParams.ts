import { SearchParamKeyType, SearchParamType, SearchParamValueType } from '@src/hooks/useSearchParamsSafe';
import { ReadonlyURLSearchParams } from 'next/navigation';

export class SearchParams {
  #searchParams: SearchParamType[];

  constructor(searchParams: SearchParamType[]) {
    this.#searchParams = searchParams;
  }

  get = (key: SearchParamKeyType) => {
    return this.#searchParams.find(([searchParamKey]) => key === searchParamKey)?.[1] ?? '';
  };

  getAll = (key: SearchParamKeyType) => {
    return this.#searchParams
      .filter(([searchParamKey]) => key === searchParamKey)
      .map(([searchParamKey, searchParamValue]) => searchParamValue);
  };

  add = ([searchParamKey, searchParamValue]: SearchParamType) => {
    this.#searchParams = this.#searchParams.concat([[searchParamKey, searchParamValue]]);
  };

  set = ([searchParamKey, searchParamValue]: SearchParamType) => {
    this.#searchParams = this.#searchParams
      .filter(([key]) => key !== searchParamKey)
      .concat([[searchParamKey, searchParamValue]]);
  };

  remove = ([searchParamKey, searchParamValue]: SearchParamType) => {
    this.#searchParams = this.#searchParams.filter(
      ([key, value]) => !(key === searchParamKey && value === searchParamValue),
    );
  };

  removeAll = (searchParamKey: SearchParamKeyType) => {
    this.#searchParams = this.#searchParams.filter(([key]) => key !== searchParamKey);
  };

  getSearchParams() {
    return this.#createSearchParams();
  }

  #createSearchParams() {
    return this.#searchParams.reduce(
      (acc, [key, value], index) => acc + `${index === 0 ? '?' : '&'}${key}=${value}`,
      '',
    );
  }
}
