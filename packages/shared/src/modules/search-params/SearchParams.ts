import { SearchParamKeyType, SearchParamType, SearchParamValueType } from '.';

export default class SearchParams {
  #searchParamsMap: Map<SearchParamKeyType, Set<SearchParamValueType>>;

  constructor(searchParams: SearchParamType[]) {
    this.#searchParamsMap = new Map();
    searchParams.forEach(([key, value]) => {
      if (!this.#searchParamsMap.has(key)) {
        this.#searchParamsMap.set(key, new Set());
      }
      this.#searchParamsMap.get(key)?.add(value);
    });
  }

  get = (key: SearchParamKeyType) => {
    const values = this.#searchParamsMap.get(key);
    return values ? Array.from(values)[0] || '' : '';
  };

  getAll = (key: SearchParamKeyType) => {
    return Array.from(this.#searchParamsMap.get(key) || []);
  };

  add = (key: SearchParamKeyType, value: SearchParamValueType) => {
    if (!this.#searchParamsMap.has(key)) {
      this.#searchParamsMap.set(key, new Set());
    }
    this.#searchParamsMap.get(key)?.add(value);
  };

  set = (key: SearchParamKeyType, value: SearchParamValueType) => {
    this.#searchParamsMap.set(key, new Set([value]));
  };

  remove = (key: SearchParamKeyType, value: SearchParamValueType) => {
    this.#searchParamsMap.get(key)?.delete(value);
    if (this.#searchParamsMap.get(key)?.size === 0) {
      this.#searchParamsMap.delete(key);
    }
  };

  removeAll = (key: SearchParamKeyType) => {
    this.#searchParamsMap.delete(key);
  };

  getSearchParams() {
    const params: SearchParamType[] = [];
    this.#searchParamsMap.forEach((values, key) => {
      values.forEach(value => params.push([key, value]));
    });

    return params.reduce((acc, [key, value], index) => acc + `${index === 0 ? '?' : '&'}${key}=${value}`, '');
  }
}
