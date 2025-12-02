"use client";

import { DragBox } from "@src/components";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useDeleteMemosMutation,
	useKeyboardBind,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { toast } from "@web-memo/ui";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import MemoDialog from "../MemoDialog";
import { useDragSelection, useMemoDialog, useMemoSelection } from "./_hooks";
import MemoEmptyState from "./MemoEmptyState";
import MemoListItem from "./MemoListItem";
import MemoOptionHeader from "./MemoOptionHeader";

const CONTAINER_ID = "memo-list";

interface MemoListProps extends LanguageType {
	memos: GetMemoResponse[];
}

export default function MemoList({ lng, memos }: MemoListProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();
	const searchParams = useSearchParams();
	const dragBoxRef = useRef<HTMLDivElement>(null);

	const {
		selectedMemoIds,
		isSelectingMode,
		checkMemoSelected,
		handleSelectMemoItem,
		setSelectedMemoIds,
		clearSelection,
		selectAll,
	} = useMemoSelection();

	const { dialogMemoId } = useMemoDialog();
	const { mutate: deleteMemos } = useDeleteMemosMutation();

	const { rafRef } = useDragSelection({
		containerId: CONTAINER_ID,
		dragBoxRef,
		onSelectionChange: setSelectedMemoIds,
	});

	const closeMemoOption = () => {
		clearSelection();
		searchParams.removeAll("id");
		router.replace(searchParams.getUrl(), { scroll: false });
	};

	const handleSelectAll = useCallback(() => {
		const allMemoIds = memos.map((memo) => memo.id);
		selectAll(allMemoIds);
	}, [memos, selectAll]);

	const handleDeleteSelected = useCallback(() => {
		if (selectedMemoIds.length === 0) return;
		const activeElement = document.activeElement;
		const isInputFocused =
			activeElement instanceof HTMLInputElement ||
			activeElement instanceof HTMLTextAreaElement;
		if (isInputFocused) return;

		deleteMemos(selectedMemoIds, {
			onSuccess: () => {
				toast({ title: t("toastTitle.memoDeleted") });
				clearSelection();
			},
		});
	}, [selectedMemoIds, deleteMemos, clearSelection, t]);

	useEffect(
		function closeRAFOnUnmount() {
			return () => {
				if (rafRef.current) {
					cancelAnimationFrame(rafRef.current);
				}
			};
		},
		[rafRef],
	);

	useKeyboardBind({ key: "Escape", callback: closeMemoOption });
	useKeyboardBind({ key: "a", callback: handleSelectAll, ctrlKey: true });
	useKeyboardBind({ key: "a", callback: handleSelectAll, metaKey: true });
	useKeyboardBind({ key: "Delete", callback: handleDeleteSelected });
	useKeyboardBind({ key: "Backspace", callback: handleDeleteSelected });

	if (memos.length === 0) {
		return <MemoEmptyState lng={lng} />;
	}

	return (
		<div className="relative h-full w-full">
			<DragBox ref={dragBoxRef} />
			<AnimatePresence>
				{isSelectingMode && (
					<MemoOptionHeader
						lng={lng}
						selectedMemoIds={selectedMemoIds}
						onXButtonClick={closeMemoOption}
						closeMemoOption={closeMemoOption}
					/>
				)}
			</AnimatePresence>

			<div
				id={CONTAINER_ID}
				className="container max-w-4xl mx-auto flex flex-col gap-2 pb-48 pt-4"
			>
				<AnimatePresence mode="popLayout">
					{memos.map((memo) => (
						<MemoListItem
							key={memo.id}
							lng={lng}
							memo={memo}
							isMemoSelected={checkMemoSelected(memo.id)}
							selectMemoItem={handleSelectMemoItem}
							isSelectingMode={isSelectingMode}
						/>
					))}
				</AnimatePresence>
			</div>

			{dialogMemoId && <MemoDialog lng={lng} memoId={dialogMemoId} />}
		</div>
	);
}
