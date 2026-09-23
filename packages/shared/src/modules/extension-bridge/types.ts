import type { HighlightRow } from "../../types";
import type { HighlightAnchor } from "../highlight/types";
import type { Category } from "./constant";

export interface PageContentResponse {
	content: string;
	category: Category;
	title: string;
	favicon: string;
}

export interface PageContent {
	content: string;
}

export interface CreateMemoPayload {
	memo: string;
	url: string;
	title: string;
	favIconUrl: string;
	isWish: boolean;
	category_id: number | null;
}

export interface CreateMemoResponse {
	success: boolean;
	error?: string;
}

export interface YoutubeTranscriptResponse {
	success: boolean;
	transcript: string;
	error?: string;
}

/** content script가 background에 넘기는 조회 대상 URL. 정규화는 background가 한다 */
export interface GetHighlightsByUrlPayload {
	url: string;
}

/** 조회 결과. 실패해도 빈 배열을 돌려준다 — 복원은 조용히 실패해야 한다 */
export interface GetHighlightsByUrlResponse {
	highlights: HighlightRow[];
}

/** 선택 당시의 앵커와 페이지 메타데이터. 사용자 ID와 색상은 background가 결정한다. */
export interface IFCreateHighlightPayload {
	anchor: HighlightAnchor;
	url: string;
	title: string;
	favIconUrl: string;
}

/** 저장 성공 행 또는 사용자에게 안내할 오류 코드. */
export type TCreateHighlightResponse =
	| { success: true; highlight: HighlightRow }
	| {
			success: false;
			error: "unauthenticated" | "invalid_request" | "save_failed";
	  };

/** 현재 페이지에서 실행하는 하이라이트 색 변경 또는 삭제. */
export interface IFEditHighlightPayload {
	id: number;
	url: string;
	action: "color" | "delete";
	color?: import("../../constants/Highlight").HighlightColor;
}

/** 실제 변경된 행 또는 검증·인증·저장 오류. */
export type TEditHighlightResponse = TCreateHighlightResponse;

/** content script가 버블을 띄워도 되는지 판단하는 로그인 여부. 세션이 없거나 확인에 실패하면 false다. */
export interface IFGetLoginStatusResponse {
	isLoggedIn: boolean;
}
