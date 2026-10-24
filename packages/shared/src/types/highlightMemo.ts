import type { Database } from "./supabase";

/** 메모에 보존하는 연결 인용문과 원문 앵커. */
export type HighlightMemoSource =
	Database["memo"]["Tables"]["highlight_memo_source"]["Row"];

/** 휴지통 상태를 포함하는 하이라이트의 명시적 메모 연결. */
export interface HighlightMemoLink extends HighlightMemoSource {
	memo: { id: number; memo: string; deleted_at: string | null } | null;
}

/** 트랜잭션 생성 또는 기존 연결 재사용 결과. */
export interface CreateHighlightMemoResult {
	memo_id: number;
	highlight_id: number;
	created: boolean;
	deleted_at: string | null;
}
