import { SEARCH_TARGET_OPTIONS } from "./constant";
import type {
	SearchParamKeyType,
	SearchParamType,
	SearchParamValueType,
} from "./type";

export default class SearchParams {
	#searchParamsMap: Map<string, Set<string>>;

	constructor(searchParams: Iterable<readonly [string, string]> = []) {
		this.#searchParamsMap = new Map();
		for (const [key, value] of searchParams) {
			const values = this.#searchParamsMap.get(key) ?? new Set<string>();
			values.add(value);
			this.#searchParamsMap.set(key, values);
		}
	}

	get = <K extends SearchParamKeyType>(
		key: K,
	): SearchParamValueType<K> | "" => {
		const value = this.#searchParamsMap.get(key)?.values().next().value;
		return value && isValidValue(key, value) ? value : "";
	};

	getAll = <K extends SearchParamKeyType>(
		key: K,
	): SearchParamValueType<K>[] => {
		return Array.from(this.#searchParamsMap.get(key) || []).filter((value) =>
			isValidValue(key, value),
		);
	};

	add = (...[key, value]: SearchParamType) => {
		const values = this.#searchParamsMap.get(key) ?? new Set();
		values.add(value);
		this.#searchParamsMap.set(key, values);
	};

	set = (...[key, value]: SearchParamType) => {
		this.#searchParamsMap.set(key, new Set([value]));
	};

	remove = (...[key, value]: SearchParamType) => {
		this.#searchParamsMap.get(key)?.delete(value);
		if (this.#searchParamsMap.get(key)?.size === 0) {
			this.#searchParamsMap.delete(key);
		}
	};

	removeAll = (key: SearchParamKeyType) => {
		this.#searchParamsMap.delete(key);
	};

	getSearchParams() {
		const params = new URLSearchParams();
		this.#searchParamsMap.forEach((values, key) => {
			values.forEach((value) => params.append(key, value));
		});

		const query = params.toString();
		return query ? `?${query}` : "";
	}
}

function isValidValue<K extends SearchParamKeyType>(
	key: K,
	value: string,
): value is SearchParamValueType<K> {
	if (key === "view") return value === "grid" || value === "list";
	if (key === "searchTarget") {
		return SEARCH_TARGET_OPTIONS.some((option) => option === value);
	}
	return true;
}
