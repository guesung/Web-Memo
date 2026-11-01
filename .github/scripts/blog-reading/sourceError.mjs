/**
 * 수집 실패 사유. 서버(memo.fail_blog_sync)가 받는 error code와 같은 집합입니다.
 * 사용자에게는 코드만 노출되므로 메시지에 URL 전체나 응답 본문을 담지 않습니다.
 */
export const SOURCE_ERROR_CODES = [
	"time_limit",
	"blocked",
	"http_error",
	"rate_limited",
	"schema_changed",
	"count_mismatch",
	"network",
	"internal",
];

/**
 * 수집 중 발생한 분류된 실패.
 * @description checkpoint는 실패를 기록할 때 서버에 남길 재개 지점입니다. 없으면 기존 checkpoint를 유지합니다.
 */
export class SourceError extends Error {
	constructor(code, message, { checkpoint = null, cause } = {}) {
		super(message, cause === undefined ? undefined : { cause });
		this.name = "SourceError";
		this.code = SOURCE_ERROR_CODES.includes(code) ? code : "internal";
		this.checkpoint = checkpoint;
	}
}

/** 실행 중 마감(time limit) 여부 */
export const isPastDeadline = ({ now, deadline }) => now() >= deadline;
