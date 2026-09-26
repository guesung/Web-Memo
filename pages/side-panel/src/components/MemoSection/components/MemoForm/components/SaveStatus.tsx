import { I18n } from "@web-memo/shared/utils/extension";
import { CheckIcon, CircleAlertIcon, Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TSaveStatus } from "../hooks/useMemoForm";

/** {@link SaveStatus}의 props. */
interface SaveStatusProps {
	/** 지금 그려야 할 저장 상태 */
	saveStatus: TSaveStatus;
	/** 다시 시도 버튼 클릭 시 호출된다 */
	onRetryClick: () => void;
}

/**
 * 사이드 패널 메모 폼 하단 바의 저장 상태 표시.
 * @description 성공은 조용히(회색 체크 고정) 지나가고, 1초를 넘긴 저장과 실패만 눈에 띄게 그린다.
 * 실패에서 회복되는 순간에는 스크린 리더 전용 안내를 한 번 읽어 주고, 다시 시도 버튼이 포커스를
 * 갖고 있었다면 메모 입력창으로 포커스를 옮긴다.
 */
export default function SaveStatus({
	saveStatus,
	onRetryClick,
}: SaveStatusProps) {
	const previousSaveStatusRef = useRef(saveStatus);
	// 다시 시도 버튼이 포커스를 갖고 있었는지. 복구 시점엔 실패 분기가 이미 언마운트돼
	// document.activeElement로는 알 수 없어 포커스·블러에서 직접 기록해 둔다.
	const wasRetryButtonFocusedRef = useRef(false);
	const [recoveredAnnouncement, setRecoveredAnnouncement] = useState("");

	useEffect(() => {
		const previousSaveStatus = previousSaveStatusRef.current;
		previousSaveStatusRef.current = saveStatus;

		// 상태가 바뀔 때마다 먼저 비워 둔다. 같은 문구를 다시 넣어도 빈 문자열을 거쳐야
		// 다음 실패→복구 주기에서도 스크린 리더가 새 변경으로 인식해 다시 읽는다.
		setRecoveredAnnouncement("");

		const isRecoveredFromFailure =
			saveStatus === "saved" &&
			(previousSaveStatus === "failed" || previousSaveStatus === "retrying");

		if (!isRecoveredFromFailure) {
			return;
		}

		setRecoveredAnnouncement(I18n.get("toast_saved"));

		if (wasRetryButtonFocusedRef.current) {
			wasRetryButtonFocusedRef.current = false;
			document.getElementById("memo-textarea")?.focus();
		}
	}, [saveStatus]);

	const recoveredAnnouncementRegion = (
		<span className="sr-only" aria-live="polite">
			{recoveredAnnouncement}
		</span>
	);

	if (saveStatus === "empty") {
		return (
			<div data-save-status={saveStatus}>{recoveredAnnouncementRegion}</div>
		);
	}

	if (saveStatus === "failed" || saveStatus === "retrying") {
		const isRetrying = saveStatus === "retrying";

		return (
			<div
				data-save-status={saveStatus}
				className="flex min-w-0 items-center gap-1"
			>
				{isRetrying ? (
					<Loader2Icon
						aria-hidden="true"
						className="h-3 w-3 shrink-0 animate-spin text-destructive"
					/>
				) : (
					<CircleAlertIcon
						aria-hidden="true"
						className="h-3 w-3 shrink-0 text-destructive"
					/>
				)}
				<span
					className="min-w-0 truncate text-xs text-destructive"
					title={I18n.get("memo_save_status_failed")}
				>
					{I18n.get("memo_save_status_failed")}
				</span>
				<button
					type="button"
					className="shrink-0 rounded-sm text-xs text-destructive underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
					disabled={isRetrying}
					aria-busy={isRetrying}
					onClick={onRetryClick}
					onFocus={() => {
						wasRetryButtonFocusedRef.current = true;
					}}
					onBlur={() => {
						wasRetryButtonFocusedRef.current = false;
					}}
				>
					{I18n.get("retry")}
				</button>
				{recoveredAnnouncementRegion}
			</div>
		);
	}

	const isSlow = saveStatus === "slow";

	return (
		<div
			data-save-status={saveStatus}
			className="flex items-center gap-1"
			title={isSlow ? undefined : I18n.get("memo_save_status_saved")}
		>
			{isSlow ? (
				<>
					<Loader2Icon
						aria-hidden="true"
						className="h-3 w-3 animate-spin text-muted-foreground"
					/>
					<span className="sr-only">{I18n.get("memo_save_status_saving")}</span>
				</>
			) : (
				<>
					<CheckIcon
						aria-hidden="true"
						className="h-3 w-3 text-muted-foreground"
					/>
					<span className="sr-only">{I18n.get("memo_save_status_saved")}</span>
				</>
			)}
			{recoveredAnnouncementRegion}
		</div>
	);
}
