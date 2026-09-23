import type {
	IFCreateHighlightPayload,
	TCreateHighlightResponse,
} from "@web-memo/shared/modules/extension-bridge";
import {
	createAnchor,
	type HighlightRenderer,
	resolveAnchor,
} from "@web-memo/shared/modules/highlight";
import type { HighlightRow } from "@web-memo/shared/types";
import { normalizeUrl } from "@web-memo/shared/utils/url";

/** 선택 툴바가 표시할 위치와 저장 상태. */
export interface IFHighlightSelectionState {
	x: number;
	y: number;
	isSaving: boolean;
	message: string;
	canSave: boolean;
}

/** 선택 추적과 저장에 필요한 외부 의존성. */
interface IFHighlightControllerOptions {
	renderer: HighlightRenderer;
	requestCreate: (
		payload: IFCreateHighlightPayload,
	) => Promise<TCreateHighlightResponse>;
	onSelectionChange: (state: IFHighlightSelectionState | null) => void;
	onPageChange?: () => void;
	/** false를 돌려주면 새 선택에 툴바를 띄우지 않는다. 생략하면 항상 띄운다. */
	isSelectionEnabled?: () => boolean;
	/** 저장이 성공해 하이라이트를 그린 뒤 한 번 불린다. */
	onSaveSuccess?: () => void;
}

/** 선택 해제 전에 앵커를 보관하며 한 번에 하나만 저장하고 성공한 결과만 그린다. */
export const createHighlightController = (
	options: IFHighlightControllerOptions,
) => {
	let selectionPayload: IFCreateHighlightPayload | null = null;
	let state: IFHighlightSelectionState | null = null;
	let isSaving = false;
	let isStopped = false;
	let pageGeneration = 0;
	let currentUrl = normalizeUrl(location.href);
	let selectionTimer: ReturnType<typeof setTimeout> | undefined;
	const savedAnchors = new Set<string>();
	const rowsById = new Map<number, HighlightRow>();
	const deletedIds = new Set<number>();
	const getAnchorKey = (payload: IFCreateHighlightPayload) =>
		JSON.stringify([payload.anchor.exact, payload.anchor.textPositionStart]);
	const emit = () => options.onSelectionChange(state);
	const clearSelectionState = () => {
		selectionPayload = null;
		state = null;
		emit();
	};
	const checkPage = () => {
		if (currentUrl === normalizeUrl(location.href)) {
			return;
		}
		currentUrl = normalizeUrl(location.href);
		pageGeneration += 1;
		selectionPayload = null;
		state = null;
		savedAnchors.clear();
		rowsById.clear();
		deletedIds.clear();
		options.renderer.clear();
		emit();
		options.onPageChange?.();
	};
	const captureSelection = () => {
		checkPage();
		if (isSaving || isStopped) {
			return;
		}
		if (options.isSelectionEnabled?.() === false) {
			clearSelectionState();

			return;
		}
		const selection = document.getSelection();
		if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
			selectionPayload = null;
			state = null;
			emit();

			return;
		}
		const range = selection.getRangeAt(0).cloneRange();
		const container = range.commonAncestorContainer;
		const element =
			container.nodeType === Node.ELEMENT_NODE
				? (container as Element)
				: container.parentElement;
		const text = range.toString();
		if (
			!document.body.contains(container) ||
			!element ||
			element.closest(
				"input, textarea, [contenteditable]:not([contenteditable='false'])",
			) ||
			text.trim().length < 3
		) {
			selectionPayload = null;
			state = null;
			emit();

			return;
		}
		const bounds = range.getBoundingClientRect();
		state = {
			x: Math.max(8, Math.min(bounds.left, window.innerWidth - 250)),
			y: Math.max(8, Math.min(bounds.bottom + 8, window.innerHeight - 90)),
			isSaving: false,
			message: "",
			canSave: false,
		};
		selectionPayload = null;
		if (text.length > 5000) {
			state.message = "highlight_selection_too_long";
			emit();

			return;
		}
		const anchor = createAnchor(range);
		if (!anchor) {
			state = null;
			emit();

			return;
		}
		selectionPayload = {
			anchor,
			url: location.href,
			title: document.title.slice(0, 2000),
			favIconUrl: (
				document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href ??
				`${location.origin}/favicon.ico`
			).slice(0, 8192),
		};
		state.canSave = true;
		emit();
	};
	const handleSelectionChange = () => {
		clearTimeout(selectionTimer);
		selectionTimer = setTimeout(captureSelection, 150);
	};
	const handleSelectionEnd = () => {
		clearTimeout(selectionTimer);
		captureSelection();
	};
	const handleViewportChange = () => {
		if (!isSaving) {
			state = null;
			selectionPayload = null;
			emit();
		}
	};
	const save = async () => {
		checkPage();
		const payload = selectionPayload;
		const saveGeneration = pageGeneration;
		if (!payload || !state || isSaving || isStopped) {
			return;
		}
		if (savedAnchors.has(getAnchorKey(payload))) {
			state = { ...state, message: "highlight_duplicate", canSave: false };
			emit();

			return;
		}
		isSaving = true;
		state = { ...state, isSaving: true, message: "" };
		emit();
		try {
			const response = await options.requestCreate(payload);
			if (
				isStopped ||
				saveGeneration !== pageGeneration ||
				normalizeUrl(location.href) !== normalizeUrl(payload.url)
			) {
				checkPage();

				return;
			}
			if (!response?.success) {
				state = {
					...state,
					isSaving: false,
					message:
						response?.error === "unauthenticated"
							? "highlight_login_required"
							: "highlight_save_failed",
				};
				emit();

				return;
			}
			savedAnchors.add(getAnchorKey(payload));
			rowsById.set(response.highlight.id, response.highlight);
			const range = resolveAnchor(payload.anchor);
			if (range) {
				options.renderer.add(response.highlight.id, range, "yellow");
			}
			selectionPayload = null;
			state = null;
			document.getSelection()?.removeAllRanges();
			emit();
			options.onSaveSuccess?.();
		} catch {
			if (
				!isStopped &&
				saveGeneration === pageGeneration &&
				normalizeUrl(location.href) === normalizeUrl(payload.url) &&
				state
			) {
				state = { ...state, isSaving: false, message: "highlight_save_failed" };
				emit();
			}
		} finally {
			isSaving = false;
		}
	};
	document.addEventListener("selectionchange", handleSelectionChange);
	document.addEventListener("mouseup", handleSelectionEnd);
	document.addEventListener("keyup", handleSelectionEnd);
	window.addEventListener("scroll", handleViewportChange, true);
	window.addEventListener("resize", handleViewportChange);
	const pageTimer = setInterval(checkPage, 500);

	return {
		save,
		/** 열린 선택 툴바를 닫는다. 저장 중에는 결과 안내를 지키려고 닫지 않는다. */
		dismissSelection: () => {
			if (!isSaving) {
				clearSelectionState();
			}
		},
		getRow: (id: number) => rowsById.get(id),
		updateRow: (row: HighlightRow) => rowsById.set(row.id, row),
		removeRow: (id: number) => {
			const row = rowsById.get(id);
			deletedIds.add(id);
			rowsById.delete(id);
			if (row) {
				const key = JSON.stringify([
					row.exact_text,
					row.text_position_start ?? 0,
				]);
				if (
					![...rowsById.values()].some(
						(other) =>
							JSON.stringify([
								other.exact_text,
								other.text_position_start ?? 0,
							]) === key,
					)
				) {
					savedAnchors.delete(key);
				}
			}
		},
		registerRows: (rows: HighlightRow[]) => {
			const unseenRows: HighlightRow[] = [];
			for (const row of rows) {
				if (deletedIds.has(row.id)) {
					continue;
				}
				if (!rowsById.has(row.id)) {
					rowsById.set(row.id, row);
				}
				const key = JSON.stringify([
					row.exact_text,
					row.text_position_start ?? 0,
				]);
				if (!savedAnchors.has(key)) {
					unseenRows.push(row);
				}
				savedAnchors.add(key);
			}

			return unseenRows;
		},
		stop: () => {
			isStopped = true;
			clearTimeout(selectionTimer);
			clearInterval(pageTimer);
			document.removeEventListener("selectionchange", handleSelectionChange);
			document.removeEventListener("mouseup", handleSelectionEnd);
			document.removeEventListener("keyup", handleSelectionEnd);
			window.removeEventListener("scroll", handleViewportChange, true);
			window.removeEventListener("resize", handleViewportChange);
		},
	};
};
