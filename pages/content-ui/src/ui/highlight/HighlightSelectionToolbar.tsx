import { I18n } from "@web-memo/shared/utils/extension";
import { Highlighter } from "lucide-react";
import { HighlightEditToolbar } from "./HighlightEditToolbar";
import {
	type IFHighlightSelectionOptions,
	useHighlightSelection,
} from "./useHighlightSelection";

/** 원문 선택 옆에 저장 버튼과 로그인·실패 안내를 표시한다. */
export const HighlightSelectionToolbar = (
	props: IFHighlightSelectionOptions,
) => {
	const {
		selectionState,
		handleHighlightButtonClick,
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
	if (!selectionState) {
		return null;
	}

	return (
		<div
			role="toolbar"
			aria-label={I18n.get("highlight_create")}
			className="fixed z-[2147483647] flex max-w-[240px] flex-col gap-2 rounded-md border bg-background p-2 text-sm text-foreground shadow-lg"
			style={{ left: selectionState.x, top: selectionState.y }}
			onPointerDown={(event) => event.preventDefault()}
			onMouseUp={(event) => event.stopPropagation()}
			onKeyUp={(event) => event.stopPropagation()}
		>
			{selectionState.canSave && (
				<button
					type="button"
					disabled={selectionState.isSaving}
					onClick={handleHighlightButtonClick}
					className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent disabled:opacity-50"
				>
					<Highlighter size={16} aria-hidden="true" />
					{I18n.get(
						selectionState.isSaving ? "highlight_saving" : "highlight_create",
					)}
				</button>
			)}
			{selectionState.message && (
				<output>{I18n.get(selectionState.message)}</output>
			)}
		</div>
	);
};
