import {
	HIGHLIGHT_COLOR_STYLE,
	HIGHLIGHT_COLORS,
} from "@web-memo/shared/constants";
import { I18n } from "@web-memo/shared/utils/extension";
import { ArrowDown, ArrowUp, Ban, Pencil, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { HighlightEditToolbar } from "./HighlightEditToolbar";
import { HighlightIntroCoachmark } from "./HighlightIntroCoachmark";
import {
	type IFHighlightSelectionOptions,
	useHighlightSelection,
} from "./useHighlightSelection";

/** 버블 위쪽 기준으로 아래에 말풍선을 놓는 데 필요한 세로 공간. */
const INTRO_COACHMARK_REQUIRED_SPACE_PX = 200;

/** 원문 선택 옆에 색상·메모 버블과 설정 메뉴, 첫 선택 말풍선을 표시한다. */
export const HighlightSelectionToolbar = (
	props: IFHighlightSelectionOptions,
) => {
	const toolbarRef = useRef<HTMLDivElement>(null);
	const {
		selectionState,
		bubblePosition,
		positionSettingStatus,
		isMenuOpen,
		menuError,
		isCreatedNoteOpen,
		isIntroVisible,
		disabledNoticePosition,
		handleHighlightColorClick,
		handleHighlightNoteClick,
		handleBubbleCloseClick,
		handleBubblePositionClick,
		handleBubbleDisableClick,
		handleMenuDismiss,
		handleIntroConfirmClick,
		editState,
		handleHighlightEdit,
	} = useHighlightSelection(props);
	useEffect(() => {
		if (!isMenuOpen) {
			return;
		}
		const handleDocumentPointerDown = (event: PointerEvent) => {
			if (!event.composedPath().includes(toolbarRef.current as EventTarget)) {
				handleMenuDismiss();
			}
		};
		const handleDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				handleMenuDismiss();
			}
		};
		document.addEventListener("pointerdown", handleDocumentPointerDown);
		document.addEventListener("keydown", handleDocumentKeyDown);

		return () => {
			document.removeEventListener("pointerdown", handleDocumentPointerDown);
			document.removeEventListener("keydown", handleDocumentKeyDown);
		};
	}, [isMenuOpen, handleMenuDismiss]);
	if (editState) {
		return (
			<HighlightEditToolbar
				state={editState}
				initialNoteOpen={isCreatedNoteOpen}
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
					{I18n.get(
						disabledNoticePosition.scope === "site"
							? "highlight_bubble_disabled_site_title"
							: "highlight_bubble_disabled_all_title",
					)}
				</span>
				<span className="text-xs text-muted-foreground">
					{I18n.get(
						disabledNoticePosition.scope === "site"
							? "highlight_bubble_disabled_site_description"
							: "highlight_bubble_disabled_all_description",
					)}
				</span>
			</output>
		);
	}
	if (!selectionState) {
		return null;
	}
	const shouldPlaceAbove =
		bubblePosition === "above" && selectionState.aboveY > 8;
	const selectedY = shouldPlaceAbove ? selectionState.aboveY : selectionState.y;
	const introPlacement =
		window.innerHeight - selectedY >= INTRO_COACHMARK_REQUIRED_SPACE_PX
			? "below"
			: "above";
	const isMenuAbove = window.innerHeight - selectedY < 220;

	return (
		<div
			ref={toolbarRef}
			role="toolbar"
			aria-label={I18n.get("highlight_create")}
			className="fixed z-[2147483647] flex flex-col items-start gap-1 text-foreground animate-fade-in"
			style={{ left: selectionState.x, top: selectedY }}
			onPointerDown={(event) => event.preventDefault()}
			onMouseUp={(event) => event.stopPropagation()}
			onKeyUp={(event) => event.stopPropagation()}
		>
			<div className="flex h-9 items-center rounded-full border bg-background px-1 text-sm shadow-lg">
				{HIGHLIGHT_COLORS.map((color) => (
					<button
						key={color}
						type="button"
						aria-label={I18n.get(`highlight_color_${color}`)}
						disabled={!selectionState.canSave || selectionState.isSaving}
						onClick={() => {
							void handleHighlightColorClick(color);
						}}
						className="flex size-7 items-center justify-center rounded-full hover:bg-accent disabled:opacity-50"
					>
						<span
							className="size-4 rounded-full border border-black/10"
							style={{ backgroundColor: HIGHLIGHT_COLOR_STYLE[color].bar }}
						/>
					</button>
				))}
				<span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
				<button
					type="button"
					aria-label={I18n.get("highlight_note")}
					disabled={!selectionState.canSave || selectionState.isSaving}
					onClick={() => {
						void handleHighlightNoteClick();
					}}
					className="flex size-7 items-center justify-center rounded-full hover:bg-accent disabled:opacity-50"
				>
					<Pencil size={16} aria-hidden="true" />
				</button>
				<button
					type="button"
					aria-label={I18n.get("highlight_bubble_disable")}
					aria-expanded={isMenuOpen}
					disabled={selectionState.isSaving}
					onClick={handleBubbleCloseClick}
					className="flex size-7 items-center justify-center rounded-full hover:bg-accent disabled:opacity-50"
				>
					<X size={16} aria-hidden="true" />
				</button>
			</div>
			{isMenuOpen && (
				<div
					role="menu"
					className={`absolute left-0 z-10 flex max-h-[calc(100vh-16px)] w-64 flex-col overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-lg ${isMenuAbove ? "bottom-full mb-2" : "top-full mt-2"}`}
				>
					<div className="px-3 py-2 font-semibold">
						{I18n.get("highlight_bubble_menu_title")}
					</div>
					<button
						type="button"
						role="menuitem"
						disabled={positionSettingStatus !== "ready"}
						title={
							positionSettingStatus === "error"
								? I18n.get("highlight_save_failed")
								: undefined
						}
						onClick={() => {
							void handleBubblePositionClick();
						}}
						className="flex items-center gap-2 rounded px-3 py-2 text-left hover:bg-accent disabled:opacity-50"
					>
						{bubblePosition === "below" ? (
							<ArrowUp size={16} aria-hidden="true" />
						) : (
							<ArrowDown size={16} aria-hidden="true" />
						)}
						{I18n.get(
							bubblePosition === "below"
								? "highlight_bubble_position_above"
								: "highlight_bubble_position_below",
						)}
					</button>
					<button
						type="button"
						role="menuitem"
						onClick={() => {
							void handleBubbleDisableClick("site");
						}}
						className="flex flex-col rounded px-3 py-2 text-left hover:bg-accent"
					>
						<span className="flex items-center gap-2">
							<Ban size={16} aria-hidden="true" />
							{I18n.get("highlight_bubble_disable_site")}
						</span>
						<span className="pl-6 text-xs text-muted-foreground">
							{location.hostname}
						</span>
					</button>
					<button
						type="button"
						role="menuitem"
						onClick={() => {
							void handleBubbleDisableClick("all");
						}}
						className="flex items-center gap-2 rounded px-3 py-2 text-left hover:bg-accent"
					>
						<Ban size={16} aria-hidden="true" />
						{I18n.get("highlight_bubble_disable_all")}
					</button>
					{menuError && (
						<output className="px-3 py-2 text-xs text-destructive">
							{I18n.get(menuError)}
						</output>
					)}
				</div>
			)}
			{selectionState.message && (
				<output className="max-w-60 rounded-md border bg-background px-3 py-1 text-xs text-muted-foreground shadow-lg">
					{I18n.get(selectionState.message)}
				</output>
			)}
			{isIntroVisible && !isMenuOpen && (
				<HighlightIntroCoachmark
					placement={introPlacement}
					onIntroConfirmClick={handleIntroConfirmClick}
				/>
			)}
		</div>
	);
};
