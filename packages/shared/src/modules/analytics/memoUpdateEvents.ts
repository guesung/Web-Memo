import type { MemoTable } from "../../types";
import type { TAnalyticsEvent, TCategoryChangeSource } from "./type";

/**
 * 메모 변경 이벤트에 덧붙일 맥락.
 * @description 요청 키만으로는 알 수 없는 정보(누가·어떤 경로로 바꿨는지)를 호출부가 넘깁니다.
 */
export interface IFMemoUpdateContext {
	/** 카테고리를 바꾼 경로. 모르면 비워 두고, 그러면 source 없이 보냅니다 */
	categorySource?: TCategoryChangeSource;
}

/** 메모 변경 필드를 분석 이벤트로 해석합니다. 전송이나 저장소 접근은 하지 않습니다. */
export const buildMemoUpdateEvents = (
	request: Partial<MemoTable["Update"]>,
	context: IFMemoUpdateContext = {},
): TAnalyticsEvent[] => {
	const events: TAnalyticsEvent[] = [];
	const STATUS_KEYS = ["isWish", "isStar", "isReading"] as const;
	const CONTENT_KEYS = ["memo", "title", "impression", "actionItem"] as const;

	for (const statusKey of STATUS_KEYS) {
		if (!(statusKey in request)) {
			continue;
		}

		events.push({
			name: "memo_status_toggle",
			params: {
				status: statusKey.replace(/^is/, "").toLowerCase() as
					| "wish"
					| "star"
					| "reading",
				enabled: Boolean(request[statusKey]),
			},
		});
	}

	if ("category_id" in request) {
		if (context.categorySource) {
			events.push({
				name: "memo_category_change",
				params: { source: context.categorySource },
			});
		} else {
			events.push({ name: "memo_category_change" });
		}
	}

	const changedContentKeys = CONTENT_KEYS.filter(
		(contentKey) => contentKey in request,
	);

	if (changedContentKeys.length > 0) {
		events.push({
			name: "memo_write",
			params: { fields: [...changedContentKeys].sort().join(",") },
		});
	}

	return events;
};
