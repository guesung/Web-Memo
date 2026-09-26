import { I18n } from "@web-memo/shared/utils/extension";
import { CheckIcon, CloudOffIcon, Loader2Icon } from "lucide-react";

/**
 * 메모 저장 상태 표시줄에 넣을 아이콘·문구 하나.
 * @description saving·saved는 저장 큐, offline·offlineSaved는 오프라인, syncing·syncFailed는
 * 대기열 flush 중임을 나타낸다. null이면 아무것도 보여줄 게 없다는 뜻이다. 사용처: MemoForm/index.tsx
 */
export type TSaveStatus =
	| "saving"
	| "saved"
	| "offline"
	| "offlineSaved"
	| "syncing"
	| "syncFailed"
	| null;

/** SaveStatus props */
interface SaveStatusProps {
	status: TSaveStatus;
	/** syncFailed일 때만 쓰는 다시 시도 버튼 클릭 핸들러 */
	onRetryClick?: () => void;
}

/** 메모 입력창 아래에 저장·오프라인·동기화 상태를 한 줄로 보여준다. */
export default function SaveStatus({ status, onRetryClick }: SaveStatusProps) {
	const content = getSaveStatusContent(status);

	if (!content) {
		return null;
	}

	return (
		<div className="flex min-w-0 items-center gap-1" title={content.text}>
			<content.Icon
				className={`h-3 w-3 shrink-0 ${content.iconClassName}`}
				aria-hidden="true"
			/>
			<span
				className={`truncate whitespace-nowrap text-xs ${content.textClassName}`}
			>
				{content.text}
			</span>
			{status === "syncFailed" && (
				<button
					type="button"
					className="shrink-0 whitespace-nowrap text-xs text-muted-foreground underline hover:text-foreground"
					onClick={onRetryClick}
				>
					{I18n.get("retry")}
				</button>
			)}
		</div>
	);
}

/** 상태별 아이콘·문구·색을 계산한다. null이면 표시줄 자체를 숨긴다 */
const getSaveStatusContent = (status: TSaveStatus) => {
	switch (status) {
		case "saving":
			return {
				Icon: Loader2Icon,
				iconClassName: "animate-spin text-muted-foreground",
				textClassName: "text-muted-foreground",
				text: I18n.get("save_status_saving"),
			};
		case "saved":
			return {
				Icon: CheckIcon,
				iconClassName: "text-green-600 dark:text-green-400",
				textClassName: "text-green-600 dark:text-green-400",
				text: I18n.get("save_status_saved"),
			};
		case "offlineSaved":
			return {
				Icon: CloudOffIcon,
				iconClassName: "text-muted-foreground",
				textClassName: "text-muted-foreground",
				text: I18n.get("save_status_offline_saved"),
			};
		case "offline":
			return {
				Icon: CloudOffIcon,
				iconClassName: "text-muted-foreground",
				textClassName: "text-muted-foreground",
				text: I18n.get("save_status_offline"),
			};
		case "syncing":
			return {
				Icon: Loader2Icon,
				iconClassName: "animate-spin text-muted-foreground",
				textClassName: "text-muted-foreground",
				text: I18n.get("save_status_syncing"),
			};
		case "syncFailed":
			return {
				Icon: CloudOffIcon,
				iconClassName: "text-muted-foreground",
				textClassName: "text-muted-foreground",
				text: I18n.get("save_status_sync_failed"),
			};
		default:
			return null;
	}
};
