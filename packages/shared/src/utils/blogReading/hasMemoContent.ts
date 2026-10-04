import type { MemoRow } from "../../types/supabaseCustom";

/**
 * 메모 칸 하나에 내용이 있는지 본다.
 * @description SQL `memo.has_blog_memo_text`와 같은 계약이다. `String.prototype.trim()`이 지우는 공백만 남으면 비어 있다.
 * zero-width space(U+200B)·NEL(U+0085)은 trim 대상이 아니라 내용으로 본다(fixtures.json `memoText`).
 */
export const hasMemoText = (text: string | null | undefined): boolean =>
	(text ?? "").trim().length > 0;

/**
 * 블로그 글을 완료로 만드는 메모 내용이 있는지 본다.
 * @description memo·impression·actionItem 중 하나라도 {@link hasMemoText}면 true.
 * 제목·방문·하이라이트·빈 위시 행만으로는 완료가 아니다. 삭제 여부(`deleted_at`)는 호출 측이 거른다.
 * 실제 완료 판정은 서버 RPC가 하므로, 저장 전 초안으로 완료를 앞당겨 표시하는 데 쓰지 않는다.
 */
export const hasMemoContent = (
	memo: Pick<MemoRow, "memo" | "impression" | "actionItem">,
): boolean =>
	hasMemoText(memo.memo) ||
	hasMemoText(memo.impression) ||
	hasMemoText(memo.actionItem);
