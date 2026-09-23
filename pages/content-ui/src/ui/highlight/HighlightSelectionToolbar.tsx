import { I18n } from "@web-memo/shared/utils/extension";
import { X } from "lucide-react";
import { HighlightEditToolbar } from "./HighlightEditToolbar";
import { HighlightIntroCoachmark } from "./HighlightIntroCoachmark";
import {
	type IFHighlightSelectionOptions,
	useHighlightSelection,
} from "./useHighlightSelection";

/** 버블 위쪽 기준으로 아래에 말풍선을 놓는 데 필요한 세로 공간. 버블·안내 행·말풍선 높이를 합친 값이다. */
const INTRO_COACHMARK_REQUIRED_SPACE_PX = 200;

/** 원문 선택 옆에 로고 버블(저장·끄기)과 첫 선택 말풍선, 끔 안내를 표시한다. */
export const HighlightSelectionToolbar = (
	props: IFHighlightSelectionOptions,
) => {
	const {
		selectionState,
		isIntroVisible,
		disabledNoticePosition,
		handleHighlightButtonClick,
		handleBubbleCloseClick,
		handleIntroConfirmClick,
		editState,
		handleHighlightEdit,
	} = useHighlightSelection(props);
	if (editState) {
		return (
			<HighlightEditToolbar
				state={editState}
				onHighlightEdit={handleHighlightEdit}
			/>
		);
	}
	if (disabledNoticePosition) {
		return (
			<output
				className="fixed z-[2147483647] flex flex-col gap-1 rounded-lg border bg-background px-3 py-2 text-foreground shadow-lg animate-fade-in"
				style={{
					left: disabledNoticePosition.x,
					top: disabledNoticePosition.y,
				}}
			>
				<span className="text-sm">
					{I18n.get("highlight_bubble_disabled_title")}
				</span>
				<span className="text-xs text-muted-foreground">
					{I18n.get("highlight_bubble_disabled_description")}
				</span>
			</output>
		);
	}
	if (!selectionState) {
		return null;
	}
	const introPlacement =
		window.innerHeight - selectionState.y >= INTRO_COACHMARK_REQUIRED_SPACE_PX
			? "below"
			: "above";

	return (
		<div
			role="toolbar"
			aria-label={I18n.get("highlight_create")}
			className="fixed z-[2147483647] flex flex-col items-start gap-1 text-foreground animate-fade-in"
			style={{ left: selectionState.x, top: selectionState.y }}
			onPointerDown={(event) => event.preventDefault()}
			onMouseUp={(event) => event.stopPropagation()}
			onKeyUp={(event) => event.stopPropagation()}
		>
			<div className="flex h-8 items-center rounded-full border bg-background text-sm shadow-lg">
				<button
					type="button"
					disabled={!selectionState.canSave || selectionState.isSaving}
					onClick={handleHighlightButtonClick}
					className="flex h-full items-center gap-2 rounded-l-full pl-3 pr-2 hover:bg-accent disabled:opacity-50"
				>
					<img
						src={chrome.runtime.getURL("icon-128.png")}
						alt=""
						className="size-4"
					/>
					{I18n.get(
						selectionState.isSaving ? "highlight_saving" : "highlight_create",
					)}
				</button>
				<span aria-hidden="true" className="h-4 w-px bg-border" />
				<button
					type="button"
					aria-label={I18n.get("highlight_bubble_disable")}
					disabled={selectionState.isSaving}
					onClick={handleBubbleCloseClick}
					className="flex h-full items-center rounded-r-full pl-2 pr-3 hover:bg-accent disabled:opacity-50"
				>
					<X size={16} aria-hidden="true" />
				</button>
			</div>
			{selectionState.message && (
				<output className="max-w-60 rounded-md border bg-background px-3 py-1 text-xs text-muted-foreground shadow-lg">
					{I18n.get(selectionState.message)}
				</output>
			)}
			{isIntroVisible && (
				<HighlightIntroCoachmark
					placement={introPlacement}
					onIntroConfirmClick={handleIntroConfirmClick}
				/>
			)}
		</div>
	);
};
