import type {
	SearchParamKeyType,
	SearchParamType,
	SearchParamValueType,
} from ".";

export default class SearchParams {
	#searchParamsMap: Map<SearchParamKeyType, Set<SearchParamValueType>>;

	constructor(searchParams: SearchParamType[] = []) {
		this.#searchParamsMap = searchParams.reduce((acc, [key, value]) => {
			if (!acc.has(key)) {
				acc.set(key, new Set());
			}
			acc.get(key)?.add(value);
			return acc;
		}, new Map());
	}

	get = (key: SearchParamKeyType) => {
		const values = this.#searchParamsMap.get(key);
		return values ? Array.from(values)[0] || "" : "";
	};

	getAll = (key: SearchParamKeyType) => {
		return Array.from(this.#searchParamsMap.get(key) || []);
	};

	add = (key: SearchParamKeyType, value: SearchParamValueType) => {
		const values = this.#searchParamsMap.get(key) ?? new Set();
		values.add(value);
		this.#searchParamsMap.set(key, values);
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
			values.forEach((value) => params.push([key, value]));
		});

		return params.reduce(
			(acc, [key, value], index) =>
				`${acc}${index === 0 ? "?" : "&"}${key}=${value}`,
			"",
		);
	}
}
