import type { HighlightColor } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	type HighlightRenderer,
	toHighlightItem,
} from "@web-memo/shared/modules/highlight";
import { normalizeUrl } from "@web-memo/shared/utils/url";
import { useEffect, useRef, useState } from "react";
import {
	createHighlightController,
	type IFHighlightSelectionState,
} from "./createHighlightController";
import {
	createHighlightEditor,
	type IFHighlightEditState,
} from "./createHighlightEditor";
import { startHighlightRestore } from "./restoreHighlights";
import { useHighlightBubbleGate } from "./useHighlightBubbleGate";

/** 생성과 복원이 공유하는 렌더러 및 중복 판정에 필요한 기존 행. */
export interface IFHighlightSelectionOptions {
	renderer: HighlightRenderer;
	notesById: Map<number, string>;
}

/** 텍스트 선택 추적과 메시지 저장의 생명주기를 관리한다. */
export const useHighlightSelection = (options: IFHighlightSelectionOptions) => {
	const [editState, setEditState] = useState<IFHighlightEditState | null>(null);
	const [isCreatedNoteOpen, setIsCreatedNoteOpen] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [menuError, setMenuError] = useState("");
	const [lastUsedColor, setLastUsedColor] = useState<HighlightColor>("yellow");
	const editorRef = useRef<ReturnType<typeof createHighlightEditor> | null>(
		null,
	);
	const [selectionState, setSelectionState] =
		useState<IFHighlightSelectionState | null>(null);
	const controllerRef = useRef<ReturnType<
		typeof createHighlightController
	> | null>(null);
	const {
		isBubbleAllowed,
		isIntroPending,
		bubblePosition,
		positionSettingStatus,
		setBubblePosition,
	} = useHighlightBubbleGate();
	/** 컨트롤러는 한 번만 만들어지므로 게이트의 최신 값을 ref로 읽게 한다. */
	const isBubbleAllowedRef = useRef(isBubbleAllowed);
	const isIntroPendingRef = useRef(isIntroPending);
	const [disabledNoticePosition, setDisabledNoticePosition] =
		useState<IFHighlightNoticePosition | null>(null);
	useEffect(() => {
		let generation = 0;
		let isStopped = false;
		let stopRestore: (() => void) | undefined;
		const restorePage = async () => {
			const requestGeneration = ++generation;
			const url = location.href;
			stopRestore?.();
			options.notesById.clear();
			try {
				const response = await bridge.request.GET_HIGHLIGHTS_BY_URL({ url });
				if (
					isStopped ||
					generation !== requestGeneration ||
					normalizeUrl(location.href) !== normalizeUrl(url)
				) {
					return;
				}
				const rows = response?.highlights ?? [];
				const unseenRows = controller.registerRows(rows);
				for (const row of unseenRows) {
					if (row.note) {
						options.notesById.set(row.id, row.note);
					}
				}
				stopRestore = startHighlightRestore({
					items: unseenRows.map(toHighlightItem),
					getCurrentItem: (id) => {
						const row = controller.getRow(id);
						return row ? toHighlightItem(row) : undefined;
					},
					renderer: options.renderer,
				});
			} catch {
				/** 조회 실패에도 첫 생성 툴바를 유지한다. */
			}
		};
		const controller = createHighlightController({
			renderer: options.renderer,
			requestCreate: bridge.request.CREATE_HIGHLIGHT,
			onSelectionChange: (nextState) => {
				setSelectionState(nextState);
				if (!nextState) {
					setIsMenuOpen(false);
				}
			},
			onPageChange: () => {
				void restorePage();
			},
			isSelectionEnabled: () => isBubbleAllowedRef.current,
			onSaveSuccess: (color) => {
				analytics.trackEvent({
					name: "highlight_create",
					params: { color, has_note: false },
				});
				if (isIntroPendingRef.current) {
					void markIntroSeen();
				}
			},
		});
		const editor = createHighlightEditor({
			renderer: options.renderer,
			notesById: options.notesById,
			getRow: controller.getRow,
			updateRow: controller.updateRow,
			removeRow: controller.removeRow,
			onChange: (nextState) => {
				setEditState(nextState);
				if (!nextState) {
					setIsCreatedNoteOpen(false);
				}
			},
			requestEdit: bridge.request.EDIT_HIGHLIGHT,
		});
		editorRef.current = editor;
		void restorePage();
		controllerRef.current = controller;

		return () => {
			isStopped = true;
			generation += 1;
			stopRestore?.();
			editor.stop();
			editorRef.current = null;
			controller.stop();
			controllerRef.current = null;
		};
	}, [options.renderer, options.notesById]);
	useEffect(() => {
		isBubbleAllowedRef.current = isBubbleAllowed;
		if (!isBubbleAllowed) {
			controllerRef.current?.dismissSelection();
		}
	}, [isBubbleAllowed]);
	useEffect(() => {
		isIntroPendingRef.current = isIntroPending;
	}, [isIntroPending]);
	useEffect(() => {
		if (!disabledNoticePosition) {
			return;
		}
		const handlePageInteraction = () => setDisabledNoticePosition(null);
		document.addEventListener("selectionchange", handlePageInteraction);
		document.addEventListener("pointerdown", handlePageInteraction);
		window.addEventListener("scroll", handlePageInteraction, true);

		return () => {
			document.removeEventListener("selectionchange", handlePageInteraction);
			document.removeEventListener("pointerdown", handlePageInteraction);
			window.removeEventListener("scroll", handlePageInteraction, true);
		};
	}, [disabledNoticePosition]);
	const handleHighlightColorClick = async (color: HighlightColor) => {
		const row = await controllerRef.current?.save(color);
		if (row) {
			setLastUsedColor(color);
		}
	};
	const handleHighlightNoteClick = async () => {
		const position = selectionState;
		const row = await controllerRef.current?.save(lastUsedColor);
		if (row && position) {
			setIsCreatedNoteOpen(true);
			editorRef.current?.open(row, position.x, position.y);
		}
	};
	const handleBubbleCloseClick = () => {
		setMenuError("");
		setIsMenuOpen(!isMenuOpen);
	};
	const handleMenuDismiss = () => {
		setIsMenuOpen(false);
	};
	const handleBubblePositionClick = async () => {
		if (positionSettingStatus !== "ready") {
			return;
		}
		const nextPosition = bubblePosition === "below" ? "above" : "below";
		try {
			await ChromeSyncStorage.set(
				STORAGE_KEYS.highlightBubblePosition,
				nextPosition,
			);
			setBubblePosition(nextPosition);
			setIsMenuOpen(false);
			setMenuError("");
			analytics.trackEvent({
				name: "extension_setting_change",
				params: { keys: "highlightBubblePosition" },
			});
		} catch {
			setMenuError("highlight_save_failed");
		}
	};
	const handleBubbleDisableClick = async (scope: "site" | "all") => {
		if (!selectionState) {
			return;
		}
		const noticePosition = { x: selectionState.x, y: selectionState.y, scope };
		try {
			if (scope === "site") {
				const sites = await ChromeSyncStorage.get<string[]>(
					STORAGE_KEYS.highlightDisabledSites,
				);
				await ChromeSyncStorage.set(STORAGE_KEYS.highlightDisabledSites, [
					...new Set([
						...(Array.isArray(sites) ? sites : []),
						location.hostname,
					]),
				]);
			} else {
				await ChromeSyncStorage.set(STORAGE_KEYS.highlightBubbleEnabled, false);
			}
		} catch {
			setMenuError("highlight_save_failed");
			return;
		}
		analytics.trackEvent({
			name: "highlight_bubble_disable",
			params: { scope },
		});
		void markIntroSeen();
		controllerRef.current?.dismissSelection();
		setIsMenuOpen(false);
		setMenuError("");
		setDisabledNoticePosition(noticePosition);
	};
	const handleIntroConfirmClick = async () => {
		await markIntroSeen();
	};

	return {
		selectionState,
		bubblePosition,
		positionSettingStatus,
		isMenuOpen,
		menuError,
		isCreatedNoteOpen,
		isIntroVisible: isIntroPending,
		disabledNoticePosition,
		handleHighlightColorClick,
		handleHighlightNoteClick,
		handleBubbleCloseClick,
		handleMenuDismiss,
		handleBubblePositionClick,
		handleBubbleDisableClick,
		handleIntroConfirmClick,
		editState,
		handleHighlightEdit: async (
			action: Parameters<ReturnType<typeof createHighlightEditor>["edit"]>[0],
		) => {
			const didSave = await editorRef.current?.edit(action);
			if (didSave && action.action === "note") {
				analytics.trackEvent({ name: "highlight_note_update" });
			}
		},
	};
};

/** 첫 선택 말풍선을 본 것으로 기록한다. 실패하면 다음 선택에서 다시 보여준다. */
const markIntroSeen = async () => {
	try {
		await ChromeSyncStorage.set(STORAGE_KEYS.highlightIntroSeen, true);
	} catch {
		/** 기록 실패는 말풍선이 한 번 더 뜨는 것으로 끝난다. */
	}
};

/** 끔 안내를 띄울 화면 좌표. 사라진 버블의 자리를 그대로 쓴다. */
interface IFHighlightNoticePosition {
	x: number;
	y: number;
	scope: "site" | "all";
}
