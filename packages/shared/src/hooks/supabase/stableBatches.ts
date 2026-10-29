import { useRef } from "react";

/** 새 식별자만 별도 배치에 넣어 기존 쿼리 키를 유지한다. */
export function useStableBatches<T extends string | number>(
	values: T[],
	scope: string | undefined,
	batchSize = 20,
) {
	const state = useRef<{ scope: string | undefined; batches: T[][] }>({
		scope,
		batches: [],
	});
	if (state.current.scope !== scope) {
		state.current = { scope, batches: [] };
	}

	const seen = new Set(state.current.batches.flat());
	const added = [...new Set(values)].filter((value) => !seen.has(value));
	for (let start = 0; start < added.length; start += batchSize) {
		state.current.batches.push(added.slice(start, start + batchSize));
	}

	const active = new Set(values);
	return state.current.batches.filter((batch) =>
		batch.some((value) => active.has(value)),
	);
}
