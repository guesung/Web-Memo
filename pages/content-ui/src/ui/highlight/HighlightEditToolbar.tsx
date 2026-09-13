import {
	HIGHLIGHT_COLOR_STYLE,
	HIGHLIGHT_COLORS,
	type HighlightColor,
} from "@web-memo/shared/constants";
import { I18n } from "@web-memo/shared/utils/extension";
import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { IFHighlightEditState } from "./createHighlightEditor";

/** 편집 메뉴의 표시 상태와 저장 핸들러. */
interface IFHighlightEditToolbarProps {
	state: IFHighlightEditState;
	onHighlightEdit: (
		action: { action: "delete" } | { action: "color"; color: HighlightColor },
	) => void;
}

/** 기존 하이라이트의 다섯 색상과 삭제 동작을 제공한다. */
export const HighlightEditToolbar = (props: IFHighlightEditToolbarProps) => {
	const toolbarRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const previousFocus = document.activeElement;
		toolbarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

		return () => {
			if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
				previousFocus.focus();
			}
		};
	}, []);

	return (
		<div
			ref={toolbarRef}
			role="toolbar"
			aria-label={I18n.get("highlight_edit")}
			aria-busy={props.state.isSaving}
			className="fixed z-[2147483647] flex max-w-[250px] flex-col gap-2 rounded-md border bg-background p-2 text-sm text-foreground shadow-lg"
			style={{ left: props.state.x, top: props.state.y }}
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
