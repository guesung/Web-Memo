import type { MemoTable } from "../../types";
import type { TAnalyticsEvent } from "./type";

/** 메모 변경 필드를 분석 이벤트로 해석합니다. 전송이나 저장소 접근은 하지 않습니다. */
export const buildMemoUpdateEvents = (
	request: Partial<MemoTable["Update"]>,
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
		events.push({ name: "memo_category_change" });
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
