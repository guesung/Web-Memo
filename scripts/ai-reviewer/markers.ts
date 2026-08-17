/** 리뷰 페르소나 식별자 */
export type TPersona = "intern" | "senior";

/** 봇 코멘트 본문에 삽입되는 마커 정보 */
export interface IFMarker {
	/** 어느 페르소나가 단 코멘트인지 */
	persona: TPersona;
	/** 코멘트 종류. 질문은 `q1`~`qN`, 재답변은 `reply`, 지적 요약은 `scan` */
	kind: string;
}

const MARKER_PATTERN = /<!--\s*ai-review:(intern|senior):([a-z0-9_-]+)\s*-->$/;
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
 * 바꿔도 기존 스레드 식별이 깨지지 않는다. 마커는 본문의 끝에만 인식되며,
 * 중간에 있거나 형식이 다르면 null을 반환한다.
 */
export const parseMarker = (body: string): IFMarker | null => {
	const matched = body.match(MARKER_PATTERN);

	if (matched === null) {
		return null;
	}

	return { persona: matched[1] as TPersona, kind: matched[2] };
};
