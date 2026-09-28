import type { PostgrestError } from "@supabase/supabase-js";

/** {@link fetchAllByPageKeyBatched}의 배치 조회 결과. */
export interface IFPageKeyBatchResult<TRow> {
	data: TRow[] | null;
	error: PostgrestError | null;
}

/** {@link fetchAllByPageKeyBatched} 인자. */
export interface IFFetchAllByPageKeyBatchedParams<TRow extends { id: number }> {
	/** `lastId`·`batchSize`를 받아 `gt("id", lastId)`·정렬·`limit(batchSize)`까지 마친 배치 쿼리를 실행한다. */
	fetchBatch: (
		lastId: number,
		batchSize: number,
	) => PromiseLike<IFPageKeyBatchResult<TRow>>;
	/** 서버측 필터를 통과한 행을 클라이언트에서 다시 확인하는 매칭 조건. 파싱 실패는 호출부에서 false로 처리해야 한다. */
	matches: (row: TRow) => boolean;
	/** 한 번에 읽어오는 배치 크기. 기본 500. */
	batchSize?: number;
}

/**
 * `page_key` 기반 조회를 500건씩 배치로 끝까지 읽어 클라이언트에서 재필터링한다.
 * @description 옛 행은 `page_key`가 비어 있어 서버측 `in`/`like` 필터만으로는 다른 페이지 결과가 섞일 수 있다.
 * 그래서 배치마다 `matches`로 한 번 더 걸러내고, 응답 건수가 배치 크기보다 작아질 때까지 `lastId`를 갱신하며 반복한다.
 * 중간 배치가 실패하면 이미 모은 결과를 버리고 즉시 에러를 반환한다.
 */
export const fetchAllByPageKeyBatched = async <TRow extends { id: number }>({
	fetchBatch,
	matches,
	batchSize = 500,
}: IFFetchAllByPageKeyBatchedParams<TRow>): Promise<
	IFPageKeyBatchResult<TRow>
> => {
	const rows: TRow[] = [];
	let lastId = 0;

	while (true) {
		const { data, error } = await fetchBatch(lastId, batchSize);
		if (error) {
			return { data: null, error };
		}

		rows.push(...(data ?? []).filter(matches));

		if (!data || data.length < batchSize) {
			break;
		}
		lastId = data[data.length - 1].id;
	}

	return { data: rows, error: null };
};
