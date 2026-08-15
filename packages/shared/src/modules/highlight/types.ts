import type { HighlightColor } from "../../constants/Highlight";

/** 하이라이트의 위치를 텍스트로 기억하는 앵커 (W3C TextQuoteSelector 기반) */
export interface HighlightAnchor {
	/** 실제로 선택된 문장 */
	exact: string;
	/** 앞 문맥 */
	prefix: string;
	/** 뒤 문맥 */
	suffix: string;
	/** 문서 텍스트 기준 근사 시작 offset. 동일 문장이 여러 번 나올 때 후보 선택 힌트 */
	textPositionStart: number;
}

/** WebView에 렌더할 하이라이트 한 건 */
export interface HighlightItem {
	id: number;
	anchor: HighlightAnchor;
	color: HighlightColor;
}

/** WebView가 앱으로 올려보내는 메시지 */
export type HighlightOutboundMessage =
	| {
			type: "highlight:create";
			anchor: HighlightAnchor;
			url: string;
			title: string;
			favIconUrl: string;
	  }
	| { type: "highlight:tap"; id: number }
	| { type: "highlight:restored"; resolved: number; unresolved: number }
	/** 저장하지 않고 거절한 경우. 앱이 사용자에게 이유를 알린다(설계 §6-4, §6-6). */
	| { type: "highlight:rejected"; reason: "tooLong" | "duplicate" };
