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

/** 선택 당시의 앵커와 페이지 메타데이터. 사용자 ID는 background가 결정하고 선택 색상은 허용 목록으로 검증한다. */
export interface IFCreateHighlightPayload {
	anchor: HighlightAnchor;
	color: import("../../constants/Highlight").HighlightColor;
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

/** 현재 페이지에서 실행하는 하이라이트 색상·메모 변경 또는 삭제. */
export interface IFEditHighlightPayload {
	id: number;
	url: string;
	action: "color" | "note" | "delete";
	note?: string;
	color?: import("../../constants/Highlight").HighlightColor;
}

/** 설정이 저장된 계정. 수신자는 자신의 계정과 비교한 뒤 재조회한다. */
export interface IFSettingUpdatedPayload {
	userId: string;
}

/** 웹 설정 화면에서 조회하고 저장할 수 있는 Chrome sync 설정 키입니다. */
export type TExtensionSettingKey =
	| "language"
	| "autoApplyCategory"
	| "highlightBubbleEnabled"
	| "highlightBubblePosition"
	| "highlightDisabledSites";

/** 허용된 Chrome sync 설정의 현재 유효 값입니다. */
export interface IFExtensionSettings {
	language: string;
	autoApplyCategory: boolean;
	highlightBubbleEnabled: boolean;
	highlightBubblePosition: "above" | "below";
	highlightDisabledSites: string[];
}

/** 설정 조회 결과와 확장 메시지 프로토콜 버전입니다. */
export type TGetExtensionSettingsResponse =
	| { success: true; protocolVersion: 1; settings: IFExtensionSettings }
	| { success: false; error: string };

/** 웹에서 확장으로 전달하는 단일 설정 변경 요청입니다. */
export type IFSetExtensionSettingPayload = {
	[TKey in TExtensionSettingKey]: {
		key: TKey;
		value: IFExtensionSettings[TKey];
	};
}[TExtensionSettingKey];

/** 저장 완료 여부와 실제로 저장된 설정 값입니다. */
export type TSetExtensionSettingResponse =
	| {
			success: true;
			key: TExtensionSettingKey;
			value: IFExtensionSettings[TExtensionSettingKey];
	  }
	| { success: false; error: string };

/** 실제 변경된 행 또는 검증·인증·저장 오류. */
export type TEditHighlightResponse = TCreateHighlightResponse;

/** content script가 버블을 띄워도 되는지 판단하는 로그인 여부. 세션이 없거나 확인에 실패하면 false다. */
export interface IFGetLoginStatusResponse {
	isLoggedIn: boolean;
}
