import {
	HIGHLIGHT_COLOR_STYLE,
	HIGHLIGHT_COLORS,
	type HighlightColor,
} from "@web-memo/shared/constants";
import { I18n } from "@web-memo/shared/utils/extension";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { IFHighlightEditState } from "./createHighlightEditor";

/** 편집 메뉴의 표시 상태와 저장 핸들러. */
interface IFHighlightEditToolbarProps {
	state: IFHighlightEditState;
	initialNoteOpen?: boolean;
	onHighlightEdit: (
		action:
			| { action: "delete" }
			| { action: "color"; color: HighlightColor }
			| { action: "note"; note: string },
	) => void;
}

/** 기존 하이라이트의 다섯 색상과 삭제 동작을 제공한다. */
export const HighlightEditToolbar = (props: IFHighlightEditToolbarProps) => {
	const toolbarRef = useRef<HTMLDivElement>(null);
	const currentRowIdRef = useRef(props.state.row.id);
	const [isNoteOpen, setIsNoteOpen] = useState(props.initialNoteOpen ?? false);
	const [note, setNote] = useState(props.state.row.note ?? "");
	useEffect(() => {
		if (currentRowIdRef.current !== props.state.row.id) {
			currentRowIdRef.current = props.state.row.id;
			setNote(props.state.row.note ?? "");
			setIsNoteOpen(props.initialNoteOpen ?? false);
		}
	}, [props.state.row.id, props.state.row.note, props.initialNoteOpen]);
	useEffect(() => {
		setNote(props.state.row.note ?? "");
	}, [props.state.row.note]);
	useEffect(() => {
		const previousFocus = document.activeElement;
		if (props.initialNoteOpen) {
			toolbarRef.current
				?.querySelector<HTMLTextAreaElement>("textarea")
				?.focus();
		} else {
			toolbarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
		}

		return () => {
			if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
				previousFocus.focus();
			}
		};
	}, [props.initialNoteOpen]);
	useEffect(() => {
		if (isNoteOpen) {
			toolbarRef.current
				?.querySelector<HTMLTextAreaElement>("textarea")
				?.focus();
		}
	}, [isNoteOpen]);

	return (
		<div
			ref={toolbarRef}
			role="toolbar"
			aria-label={I18n.get("highlight_edit")}
			aria-busy={props.state.isSaving}
			className="fixed z-[2147483647] flex max-h-[calc(100vh-16px)] max-w-[250px] flex-col gap-2 overflow-y-auto rounded-md border bg-background p-2 text-sm text-foreground shadow-lg"
			style={{
				left: props.state.x,
				top: Math.max(
					8,
					Math.min(
						props.state.y,
						window.innerHeight - (isNoteOpen ? 310 : 150),
					),
				),
			}}
			onMouseUp={(event) => event.stopPropagation()}
			onKeyUp={(event) => event.stopPropagation()}
		>
			<div className="flex gap-2">
				{HIGHLIGHT_COLORS.map((color) => (
					<button
						key={color}
						type="button"
						aria-label={I18n.get(`highlight_color_${color}`)}
						aria-pressed={props.state.row.color === color}
						disabled={props.state.isSaving}
						onClick={() => props.onHighlightEdit({ action: "color", color })}
						className="h-7 w-7 rounded-full border-2 border-transparent aria-pressed:border-foreground disabled:opacity-50"
						style={{ backgroundColor: HIGHLIGHT_COLOR_STYLE[color].bar }}
					/>
				))}
			</div>
			<button
				type="button"
				aria-expanded={isNoteOpen}
				disabled={props.state.isSaving}
				onClick={() => setIsNoteOpen(!isNoteOpen)}
				className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent disabled:opacity-50"
			>
				<Pencil size={16} aria-hidden="true" />
				{I18n.get("highlight_note")}
			</button>
			{isNoteOpen && (
				<form
					className="flex flex-col gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						props.onHighlightEdit({ action: "note", note });
					}}
				>
					<textarea
						aria-label={I18n.get("highlight_note")}
						placeholder={I18n.get("highlight_note_placeholder")}
						value={note}
						maxLength={5000}
						disabled={props.state.isSaving}
						onChange={(event) => setNote(event.target.value)}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								!event.shiftKey &&
								!event.nativeEvent.isComposing
							) {
								event.preventDefault();
								props.onHighlightEdit({ action: "note", note });
							}
						}}
						className="min-h-20 w-full resize-y rounded border bg-background p-2 text-sm"
					/>
					<button
						type="submit"
						disabled={props.state.isSaving}
						className="self-end rounded px-2 py-1 hover:bg-accent disabled:opacity-50"
					>
						{I18n.get("highlight_note_save")}
					</button>
				</form>
			)}
			<button
				type="button"
				disabled={props.state.isSaving}
				onClick={() => props.onHighlightEdit({ action: "delete" })}
				className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent disabled:opacity-50"
			>
				<Trash2 size={16} aria-hidden="true" />
				{I18n.get("highlight_delete")}
			</button>
			{props.state.isSaving && <output>{I18n.get("highlight_saving")}</output>}
			{props.state.message && <output>{I18n.get(props.state.message)}</output>}
		</div>
	);
};
