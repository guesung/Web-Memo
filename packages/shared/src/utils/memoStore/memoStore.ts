import type {
	PostgrestError,
	PostgrestSingleResponse,
} from "@supabase/supabase-js";
import type { GetMemoResponse, MemoRow, MemoTable } from "../../types";

/** 메모가 저장되는 곳. 로그인하면 서버(remote), 비로그인이면 이 기기(local)다. */
export type TMemoStoreKind = "remote" | "local";

/** 같은 URL·경로의 메모 후보 조회 응답. */
export interface IFMemoListResponse {
	data: GetMemoResponse[] | null;
	error: PostgrestError | null;
}

/**
 * 사이드 패널 메모 경로가 쓰는 저장소 계약.
 * @description 서버용 `MemoService`와 기기용 `LocalMemoService`가 같은 모양으로 구현한다.
 * 호출부는 `kind`로 구현을 구분하지 않고 이 계약만 부른다.
 */
export interface IFMemoStore {
	readonly kind: TMemoStoreKind;
	insertMemo: (
		request: MemoTable["Insert"],
	) => PromiseLike<PostgrestSingleResponse<MemoRow[]>>;
	getMemoByUrl: (url: string) => PromiseLike<IFMemoListResponse>;
	getMemosBySamePath: (url: string) => PromiseLike<IFMemoListResponse>;
	getMemoById: (id: number) => PromiseLike<IFMemoListResponse>;
	updateMemo: (params: {
		id: MemoRow["id"];
		request: MemoTable["Update"];
	}) => PromiseLike<PostgrestSingleResponse<MemoRow[]>>;
	deleteMemos: (
		idList: MemoRow["id"][],
	) => PromiseLike<PostgrestSingleResponse<MemoRow[]>>;
	restoreMemos: (
		idList: MemoRow["id"][],
	) => PromiseLike<PostgrestSingleResponse<MemoRow[]>>;
}
