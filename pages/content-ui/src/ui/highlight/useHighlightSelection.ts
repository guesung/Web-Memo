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
	const editorRef = useRef<ReturnType<typeof createHighlightEditor> | null>(
		null,
	);
	const [selectionState, setSelectionState] =
		useState<IFHighlightSelectionState | null>(null);
	const controllerRef = useRef<ReturnType<
		typeof createHighlightController
	> | null>(null);
	const { isBubbleAllowed, isIntroPending } = useHighlightBubbleGate();
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
			onSelectionChange: setSelectionState,
			onPageChange: () => {
				void restorePage();
			},
			isSelectionEnabled: () => isBubbleAllowedRef.current,
			onSaveSuccess: () => {
				analytics.trackEvent({ name: "highlight_create" });
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
			onChange: setEditState,
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
	const handleHighlightButtonClick = async () => {
		await controllerRef.current?.save();
	};
	const handleBubbleCloseClick = async () => {
		if (!selectionState) {
			return;
		}
		const noticePosition = { x: selectionState.x, y: selectionState.y };
		try {
			await ChromeSyncStorage.set(STORAGE_KEYS.highlightBubbleEnabled, false);
		} catch {
			/** 끄기를 저장하지 못하면 버블을 그대로 두어 다시 누를 수 있게 한다. */
			return;
		}
		analytics.trackEvent({ name: "highlight_bubble_disable" });
		void markIntroSeen();
		controllerRef.current?.dismissSelection();
		setDisabledNoticePosition(noticePosition);
	};
	const handleIntroConfirmClick = async () => {
		await markIntroSeen();
	};

	return {
		selectionState,
		isIntroVisible: isIntroPending,
		disabledNoticePosition,
		handleHighlightButtonClick,
		handleBubbleCloseClick,
		handleIntroConfirmClick,
		editState,
		handleHighlightEdit: (
			action: Parameters<ReturnType<typeof createHighlightEditor>["edit"]>[0],
		) => editorRef.current?.edit(action),
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
}
