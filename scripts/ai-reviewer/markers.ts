/** 리뷰 페르소나 식별자 */
export type TPersona = "intern" | "senior";

/** 봇 코멘트 본문에 삽입되는 마커 정보 */
export interface IFMarker {
	/** 어느 페르소나가 단 코멘트인지 */
	persona: TPersona;
	/** 코멘트 종류. 질문은 `q1`~`qN`, 재답변은 `reply`, 지적 요약은 `scan` */
	kind: string;
}

/**
 * 질문이 아닌 마커 종류.
 * @description CLI가 붙이는 재답변(`reply`)·지적 요약(`scan`)·승인(`approve`)은
 * 스레드를 새로 여는 질문이 아니다.
 */
const NON_QUESTION_KINDS: readonly string[] = ["reply", "scan", "approve"];

const MARKER_PATTERN = /(?:^|\n)[ \t]*<!--\s*ai-review:(intern|senior):([a-z0-9_-]+)\s*-->\s*$/;
const KIND_VALIDATION_PATTERN = /^[a-z0-9_-]+$/;

/**
 * 마커 정보를 HTML 주석 문자열로 만든다.
 * @description 렌더링되지 않으므로 코멘트 본문 끝에 그대로 붙여 쓴다.
 * parseMarker가 읽을 수 있는 kind만 허용하며, 그 외의 문자를 포함하면 throw한다.
 * @throws 만약 kind가 패턴에서 거부되는 문자를 포함하면 Error
 */
export const buildMarker = (marker: IFMarker): string => {
	if (!KIND_VALIDATION_PATTERN.test(marker.kind)) {
		throw new Error(`Invalid kind: "${marker.kind}" contains characters not in [a-z0-9_-]`);
	}

	return `<!-- ai-review:${marker.persona}:${marker.kind} -->`;
};

/**
 * 코멘트 본문에서 마커를 찾아 파싱한다.
 * @description 봇 식별을 `user.login`이 아니라 이 마커로 하므로, App 이름을
 * 바꿔도 기존 스레드 식별이 깨지지 않는다. 마커는 본문의 끝에 자기 자신의 줄에서만
 * 인식되며 (인용 마커 제외), 뒤에 따라오는 공백은 허용된다. 형식이 다르면 null.
 */
export const parseMarker = (body: string): IFMarker | null => {
	const matched = body.match(MARKER_PATTERN);

	if (matched === null) {
		return null;
	}

	return { persona: matched[1] as TPersona, kind: matched[2] };
};

/**
 * 이 마커가 봇이 새로 던진 질문인지 판별한다.
 * @description 질문 kind는 `q1`~`qN`처럼 붙지만 `reply`·`scan`·`approve`는 질문이 아니다.
 * 답글은 보통 `in_reply_to_id`가 있어 스레드 루트로 잡히지 않는데, **부모 코멘트가 삭제되면
 * GitHub이 답글을 루트로 승격시킨다.** 그때 kind를 보지 않으면 재답변 코멘트가 "작성자가
 * 답하지 않은 질문"으로 둔갑해 승인이 영영 거부된다 — 실제로 겪은 오탐이다.
 */
export const isQuestionMarker = (marker: IFMarker | null): marker is IFMarker => {
	return marker !== null && !NON_QUESTION_KINDS.includes(marker.kind);
};
