import type { MemoRow } from "../../types";
import { isNetworkError } from "../../utils/errorReporter";
import type { TAnalyticsEvent, TMemoSaveSource } from "./type";

/** 저장 결과에서 유효 본문을 판단하는 데 필요한 필드만 읽는다. */
type TMemoSaveSnapshot = Partial<
	Pick<MemoRow, "id" | "memo" | "impression" | "actionItem">
>;

export interface IFMemoSaveResult {
	before?: TMemoSaveSnapshot | null;
	after?: TMemoSaveSnapshot | null;
	isSuccess: boolean;
	source: TMemoSaveSource;
	error?: unknown;
	userId: string;
}

const CONTENT_KEYS = ["memo", "impression", "actionItem"] as const;

/** 제목·토글·공백·삭제를 제외하고 실제 저장된 본문 변경만 센다. */
export function buildMemoSaveEvents({
	before,
	after,
	isSuccess,
	source,
	error,
}: IFMemoSaveResult): TAnalyticsEvent[] {
	const reason = isSuccess
		? "none"
		: isNetworkError(error)
			? "network"
			: error instanceof Error ||
					(typeof error === "object" && error !== null && "message" in error)
				? "server"
				: "unknown";
	const events: TAnalyticsEvent[] = [
		{
			name: "memo_save_result",
			params: { is_success: isSuccess, source, reason },
		},
	];

	if (
		isSuccess &&
		typeof after?.id === "number" &&
		Number.isFinite(after.id) &&
		CONTENT_KEYS.some((key) => {
			const saved = after[key]?.trim() ?? "";
			return saved.length > 0 && saved !== (before?.[key]?.trim() ?? "");
		})
	) {
		events.push({ name: "memo_content_saved", params: { source } });
	}

	return events;
}
