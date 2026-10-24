/**
 * 확장 삭제 설문이 보내는 이탈 사유. 여기에 없는 값이 들어오면 원문을 그대로 보여준다.
 * @description 설문 페이지는 `(no-auth)/uninstall`에 있고, 응답은 `{type, reason, feedback, timestamp}`
 * 형식의 JSON 문자열로 저장된다. 그 페이지의 `_constants` 사유 목록과 같은 값·순서를 유지해야 하고,
 * 새 사유가 추가되면 이 배열과 `admin.feedback.uninstall_reason.*` 번역 키를 같이 늘려야 한다.
 * 예전 확장 설문이 남긴 응답은 `phoneNumber` 같은 필드가 더 있을 수 있다.
 */
export const UNINSTALL_REASONS = [
	"not_useful",
	"hard_to_use",
	"found_alternative",
	"privacy_concerns",
	"performance_issues",
	"other",
] as const;

/**
 * 피드백 본문이 확장 삭제 설문 응답이면 사유와 직접 쓴 문장을 꺼낸다.
 * @description 설문 응답은 `{"type":"uninstall",...}` JSON 문자열로 저장돼 목록에서 그대로 보면
 * 읽을 수 없다. 설문이 아니거나 JSON이 아니면 null을 돌려주고, 부르는 쪽이 원문을 그대로 그린다.
 * `phoneNumber` 같은 나머지 필드는 목록에서 읽을 값이 아니라 꺼내지 않는다.
 */
export default function parseUninstallFeedback(
	content: string,
): IFUninstallFeedback | null {
	try {
		const parsed = JSON.parse(content);

		if (parsed?.type !== "uninstall" || typeof parsed.reason !== "string") {
			return null;
		}

		return {
			reason: parsed.reason,
			feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
		};
	} catch {
		return null;
	}
}

/** 확장을 지운 사람이 남긴 설문 응답 */
export interface IFUninstallFeedback {
	/** 이탈 사유. `UNINSTALL_REASONS`에 없는 값일 수도 있다 */
	reason: string;
	/** 직접 쓴 문장. 사유만 고르고 나가면 빈 문자열이다 */
	feedback: string;
}
