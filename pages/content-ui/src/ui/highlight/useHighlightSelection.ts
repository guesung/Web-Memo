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
import { startHighlightRestore } from "./restoreHighlights";

/** 생성과 복원이 공유하는 렌더러 및 중복 판정에 필요한 기존 행. */
export interface IFHighlightSelectionOptions {
	renderer: HighlightRenderer;
	notesById: Map<number, string>;
}

/** 텍스트 선택 추적과 메시지 저장의 생명주기를 관리한다. */
export const useHighlightSelection = (options: IFHighlightSelectionOptions) => {
	const [selectionState, setSelectionState] =
		useState<IFHighlightSelectionState | null>(null);
	const controllerRef = useRef<ReturnType<
		typeof createHighlightController
	> | null>(null);
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
				for (const row of rows) {
					if (row.note) {
						options.notesById.set(row.id, row.note);
					}
				}
				stopRestore = startHighlightRestore({
					items: controller.registerRows(rows).map(toHighlightItem),
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
		});
		void restorePage();
		controllerRef.current = controller;

		return () => {
			isStopped = true;
			generation += 1;
			stopRestore?.();
			controller.stop();
			controllerRef.current = null;
		};
	}, [options.renderer, options.notesById]);
	const handleHighlightButtonClick = async () => {
		await controllerRef.current?.save();
	};

	return { selectionState, handleHighlightButtonClick };
};
