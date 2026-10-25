import type {
	IFEditHighlightPayload,
	TEditHighlightResponse,
} from "@web-memo/shared/modules/extension-bridge";
import type { HighlightRenderer } from "@web-memo/shared/modules/highlight";
import type { HighlightRow } from "@web-memo/shared/types";
import { normalizeUrl } from "@web-memo/shared/utils/url";
import { reportContentUiError } from "../../utils/reportError";
import { reportHighlightResponseFailure } from "./reportHighlightFailure";

/** 클릭된 하이라이트와 편집 메뉴 상태. */
export interface IFHighlightEditState {
	row: HighlightRow;
	x: number;
	y: number;
	isSaving: boolean;
	message: string;
}
/** 편집기가 공유하는 저장 행과 렌더러. */
interface IFHighlightEditorOptions {
	renderer: HighlightRenderer;
	notesById: Map<number, string>;
	getRow: (id: number) => HighlightRow | undefined;
	updateRow: (row: HighlightRow) => void;
	removeRow: (id: number) => void;
	onChange: (state: IFHighlightEditState | null) => void;
	requestEdit: (
		payload: IFEditHighlightPayload,
	) => Promise<TEditHighlightResponse>;
}

/** 성공 응답만 적용하며 페이지 전환·선택 전환 이후의 응답은 무시한다. */
export const createHighlightEditor = (options: IFHighlightEditorOptions) => {
	let state: IFHighlightEditState | null = null;
	let generation = 0;
	let stopped = false;
	let currentUrl = normalizeUrl(location.href);
	const close = () => {
		generation += 1;
		state = null;
		options.onChange(null);
	};
	const checkPage = () => {
		if (normalizeUrl(location.href) !== currentUrl) {
			currentUrl = normalizeUrl(location.href);
			close();
		}
	};
	const handleDocumentClick = (event: MouseEvent) => {
		checkPage();
		if (
			event
				.composedPath()
				.some(
					(target) =>
						target instanceof Element &&
						target.id === "WEB_MEMO_HIGHLIGHT_TOOLTIP",
				)
		) {
			return;
		}
		if (state?.isSaving) {
			return;
		}
		if (document.getSelection()?.toString()) {
			close();
			return;
		}
		const id = options.renderer.hitTest(event.clientX, event.clientY);
		const row = id === null ? undefined : options.getRow(id);
		close();
		if (!row) {
			return;
		}
		event.preventDefault();
		open(row, event.clientX, event.clientY + 12);
	};
	const open = (row: HighlightRow, x: number, y: number) => {
		state = {
			row,
			x: Math.max(8, Math.min(x, window.innerWidth - 260)),
			y: Math.max(8, Math.min(y, window.innerHeight - 150)),
			isSaving: false,
			message: "",
		};
		options.onChange(state);
	};
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape" && !state?.isSaving) {
			close();
		}
	};
	const edit = async (
		action:
			| { action: "delete" }
			| {
					action: "color";
					color: NonNullable<IFEditHighlightPayload["color"]>;
			  }
			| { action: "note"; note: string },
	) => {
		checkPage();
		if (!state || state.isSaving || stopped) {
			return false;
		}
		const selected = state;
		const requestGeneration = generation;
		const requestUrl = currentUrl;
		state = { ...state, isSaving: true, message: "" };
		options.onChange(state);
		try {
			const response = await options.requestEdit({
				id: selected.row.id,
				url: location.href,
				...action,
			});
			checkPage();
			if (
				stopped ||
				generation !== requestGeneration ||
				requestUrl !== currentUrl
			) {
				return false;
			}
			if (!response?.success) {
				reportHighlightResponseFailure({
					operation: "edit",
					response,
					tags: { action: action.action },
				});
				state = {
					...selected,
					isSaving: false,
					message:
						response?.error === "unauthenticated"
							? "highlight_login_required"
							: "highlight_save_failed",
				};
				options.onChange(state);
				return false;
			}
			if (action.action === "delete") {
				options.renderer.remove(selected.row.id);
				options.removeRow(selected.row.id);
				options.notesById.delete(selected.row.id);
				close();
			} else {
				if (action.action === "color") {
					options.renderer.setColor(selected.row.id, action.color);
				} else if (response.highlight.note) {
					options.notesById.set(selected.row.id, response.highlight.note);
				} else {
					options.notesById.delete(selected.row.id);
				}
				options.updateRow(response.highlight);
				state = { ...selected, row: response.highlight, isSaving: false };
				options.onChange(state);
			}

			return true;
		} catch (error) {
			// background에 닿지 못한 실패라 background의 보고에 남지 않는다.
			reportContentUiError({
				error,
				feature: "highlight",
				operation: "edit",
				stage: "request",
				tags: { action: action.action },
			});
			checkPage();
			if (!stopped && generation === requestGeneration) {
				state = {
					...selected,
					isSaving: false,
					message: "highlight_save_failed",
				};
				options.onChange(state);
			}

			return false;
		}
	};
	document.addEventListener("click", handleDocumentClick);
	document.addEventListener("keydown", handleKeyDown);
	const timer = setInterval(checkPage, 200);

	return {
		edit,
		open,
		close,
		stop: () => {
			stopped = true;
			close();
			clearInterval(timer);
			document.removeEventListener("click", handleDocumentClick);
			document.removeEventListener("keydown", handleKeyDown);
		},
	};
};
