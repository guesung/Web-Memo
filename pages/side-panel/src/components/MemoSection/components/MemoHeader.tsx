import { getMemoUrl } from "@src/utils";
import { analytics } from "@web-memo/shared/modules/analytics";
import type { Database } from "@web-memo/shared/types";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { Button, cn, ErrorBoundary, IconTooltip } from "@web-memo/ui";
import { ExternalLinkIcon, ListIcon, PlusIcon } from "lucide-react";
import { Suspense } from "react";

/** 메모 헤더에 현재 편집 중인 메모 ID를 전달한다. */
export default function MemoHeader({ memoData, actions }: IFMemoHeaderProps) {
	return (
		<div className="flex items-center gap-1">
			<span className="whitespace-nowrap font-bold">{I18n.get("memo")}</span>
			<ErrorBoundary>
				<Suspense fallback={<ExternalLinkIcon size={16} />}>
					<MemoLink memoData={memoData} />
				</Suspense>
			</ErrorBoundary>
			{actions && <MemoHeaderActions {...actions} />}
		</div>
	);
}

/** 이 페이지 메모 목록과 새 메모 버튼. 보일지·막힐지는 props로 받고 여기서 판단하지 않는다. */
function MemoHeaderActions({
	memoCount,
	isListOpen,
	isBusy,
	newMemoDisabledReason,
	onListClick,
	onNewMemoClick,
}: IFMemoHeaderActionsProps) {
	return (
		<div className="ml-auto flex items-center">
			<IconTooltip label={I18n.get("memo_header_list")}>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className={cn(
						"h-8 gap-1 px-2",
						isListOpen && "bg-accent",
						isBusy && "opacity-50",
					)}
					aria-label={I18n.get("memo_header_list")}
					aria-pressed={isListOpen}
					disabled={isBusy}
					onClick={onListClick}
				>
					<ListIcon className="size-4" aria-hidden="true" />
					<span className="text-xs tabular-nums text-muted-foreground">
						{memoCount}
					</span>
				</Button>
			</IconTooltip>
			<IconTooltip label={newMemoDisabledReason ?? I18n.get("memo_header_new")}>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn(
						"size-8",
						(isBusy || newMemoDisabledReason) && "opacity-50",
					)}
					aria-label={I18n.get("memo_header_new")}
					disabled={isBusy || !!newMemoDisabledReason}
					onClick={onNewMemoClick}
				>
					<PlusIcon className="size-4" aria-hidden="true" />
				</Button>
			</IconTooltip>
		</div>
	);
}

function MemoLink({ memoData }: Pick<IFMemoHeaderProps, "memoData">) {
	const handleMemoClick = () => {
		analytics.trackEvent({
			name: "open_web_from_extension",
			params: { from: "side_panel_memo" },
		});
		Tab.create({
			url: getMemoUrl({ id: memoData?.id, isWish: !!memoData?.isWish }),
		});
	};

	return (
		<IconTooltip label={I18n.get("open_in_new_tab")}>
			<Button
				variant="ghost"
				size="icon"
				className="size-8"
				onClick={handleMemoClick}
				tabIndex={0}
				aria-label={I18n.get("open_in_new_tab")}
				onKeyDown={(e) => e.key === "Enter" && handleMemoClick()}
			>
				<ExternalLinkIcon className="size-4" />
			</Button>
		</IconTooltip>
	);
}

/** 메모 헤더의 현재 편집 대상. */
interface IFMemoHeaderProps {
	memoData?: Database["memo"]["Tables"]["memo"]["Row"];
	/** 목록·새 메모 버튼의 입력. 없으면(메모 0개·잠금·불러오기 실패) 버튼을 숨긴다 */
	actions?: IFMemoHeaderActionsProps;
}

/** 목록·새 메모 버튼의 입력 */
interface IFMemoHeaderActionsProps {
	/** 현재 주소의 메모 수 */
	memoCount: number;
	/** 목록 화면이 열려 있는지 */
	isListOpen: boolean;
	/** 전환 전 저장 중이라 두 버튼을 막아야 하는지 */
	isBusy: boolean;
	/** 새 메모를 막는 사유(오프라인·동기화 중). 있으면 새 메모 버튼을 막고 말풍선에 보여 준다 */
	newMemoDisabledReason?: string;
	onListClick: () => void;
	onNewMemoClick: () => void;
}
