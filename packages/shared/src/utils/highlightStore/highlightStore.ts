import type {
	PostgrestError,
	PostgrestSingleResponse,
} from "@supabase/supabase-js";
import type { HighlightRow, HighlightTable } from "../../types";

/** 하이라이트가 저장되는 곳. 로그인하면 서버(remote), 비로그인이면 이 기기(local)다. */
export type THighlightStoreKind = "remote" | "local";

/** 하이라이트 조회 응답. */
export interface IFHighlightListResponse {
	data: HighlightRow[] | null;
	error: PostgrestError | null;
}

/** 하이라이트 한 건 조회 응답. */
export interface IFHighlightResponse {
	data: HighlightRow | null;
	error: PostgrestError | null;
}

/** 수정·삭제를 한 사용자의 한 페이지 행으로 좁히는 범위. */
export interface IFHighlightScope {
	url: string;
	userId: string;
}

/**
 * 확장(background·사이드 패널)의 하이라이트 경로가 쓰는 저장소 계약.
 * @description 서버용 `HighlightService`와 기기용 `LocalHighlightService`가 같은 모양으로 구현한다.
 * 비로그인 기기 하이라이트의 `user_id`는 빈 문자열이다.
 */
export interface IFHighlightStore {
	readonly kind: THighlightStoreKind;
	getHighlightsByUrl: (url: string) => PromiseLike<IFHighlightListResponse>;
	getHighlightById: (params: {
		id: number;
		userId: string;
	}) => PromiseLike<IFHighlightResponse>;
	insertHighlight: (
		request: HighlightTable["Insert"],
	) => PromiseLike<PostgrestSingleResponse<HighlightRow[]>>;
	updateHighlight: (params: {
		id: number;
		request: HighlightTable["Update"];
		scope?: IFHighlightScope;
	}) => PromiseLike<PostgrestSingleResponse<HighlightRow[]>>;
	deleteHighlight: (
		id: number,
		scope?: IFHighlightScope,
	) => PromiseLike<PostgrestSingleResponse<HighlightRow[]>>;
}
