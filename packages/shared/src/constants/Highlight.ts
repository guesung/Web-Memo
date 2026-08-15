/** 하이라이트 색상. DB의 highlight_color_check 제약과 반드시 일치해야 한다. */
export const HIGHLIGHT_COLORS = [
	"yellow",
	"green",
	"blue",
	"pink",
	"purple",
] as const;

/** 하이라이트 색상 값 타입. */
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** 색상을 지정하지 않았을 때 쓰는 기본 하이라이트 색상. */
export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = "yellow";

/**
 * 색상별 스타일 값.
 * background는 WebView의 ::highlight() 배경과 웹 대시보드 인용문 배경에 쓰고,
 * bar는 목록에서 문장 왼쪽에 세우는 색 막대에 쓴다.
 * 다크 모드에서도 글자가 읽히도록 배경은 알파를 넣은 값으로 둔다.
 */
export const HIGHLIGHT_COLOR_STYLE: Record<
	HighlightColor,
	{ background: string; bar: string }
> = {
	yellow: { background: "rgba(250, 204, 21, 0.40)", bar: "#facc15" },
	green: { background: "rgba(74, 222, 128, 0.40)", bar: "#4ade80" },
	blue: { background: "rgba(96, 165, 250, 0.40)", bar: "#60a5fa" },
	pink: { background: "rgba(244, 114, 182, 0.40)", bar: "#f472b6" },
	purple: { background: "rgba(192, 132, 252, 0.40)", bar: "#c084fc" },
};
