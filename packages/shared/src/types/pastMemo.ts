/**
 * 과거 메모 판정 API(POST /api/past-memo)의 요청 본문.
 * @description 사용자가 쓴 메모 본문은 담지 않는다. 현재 페이지의 공개 정보만 보낸다.
 */
export interface IFPastMemoRequest {
	pageUrl: string;
	pageTitle: string;
	/** 현재 페이지 본문 앞부분. 1,000자 이하. */
	pageExcerpt: string;
}

/** 중복 판정 근거. rule은 느슨한 URL 일치, jev는 jev 판정이다. */
export type TPastMemoSource = "rule" | "jev";

/** 현재 페이지와 같은 글로 판정된 기존 메모. */
export interface IFPastMemoDuplicate {
	id: number;
	title: string;
	url: string;
	source: TPastMemoSource;
}

/** 현재 페이지와 관련 있다고 판정된 기존 메모. */
export interface IFPastMemoRelated {
	id: number;
	title: string;
	url: string;
	favIconUrl: string | null;
	updatedAt: string | null;
}

/**
 * 과거 메모 판정 API의 응답 본문.
 * @description 판정에 실패하면 duplicate는 null, related는 빈 배열이다.
 */
export interface IFPastMemoResponse {
	duplicate: IFPastMemoDuplicate | null;
	/** 최대 3개. duplicate로 뽑힌 메모는 들어가지 않는다. */
	related: IFPastMemoRelated[];
}
