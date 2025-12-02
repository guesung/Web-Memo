"use client";

import { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";
import { DragBox } from "@src/components";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useDeleteMemosMutation,
	useKeyboardBind,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";

import { Skeleton, toast } from "@web-memo/ui";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import MemoDialog from "../MemoDialog";
import {
	useDragSelection,
	useMemoDialog,
	useMemoSelection,
} from "./_hooks";
import MemoEmptyState from "./MemoEmptyState";
import MemoItem from "./MemoItem";
import MemoOptionHeader from "./MemoOptionHeader";

const CONTAINER_ID = "memo-grid";

interface MemoGridProps extends LanguageType {
	memos: GetMemoResponse[];
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	fetchNextPage?: () => void;
}

export default function MemoGrid({
	lng,
	memos,
	hasNextPage = false,
	isFetchingNextPage = false,
	fetchNextPage,
}: MemoGridProps) {
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

	const handleRequestAppend = () => {
		if (hasNextPage && !isFetchingNextPage && fetchNextPage) {
			fetchNextPage();
		}
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

	const selectedMemos = memos.filter((memo) =>
		selectedMemoIds.includes(memo.id),
	);

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
						selectedMemos={selectedMemos}
						onXButtonClick={closeMemoOption}
						closeMemoOption={closeMemoOption}
					/>
				)}
			</AnimatePresence>

			<MasonryInfiniteGrid
				useTransform
				useResizeObserver
				observeChildren
				autoResize
				className="container h-screen max-w-full pb-48 will-change-transform pt-4"
				container={true}
				useRecycle={false}
				id={CONTAINER_ID}
				gap={16}
				align="center"
				placeholder={<MemoItemSkeleton />}
				onRequestAppend={handleRequestAppend}
			>
				{memos.map((memo, index) => (
					<MemoItem
						key={memo.id}
						lng={lng}
						data-grid-groupkey={Math.floor(index / 20)}
						memo={memo}
						isMemoSelected={checkMemoSelected(memo.id)}
						selectMemoItem={handleSelectMemoItem}
						isSelectingMode={isSelectingMode}
					/>
				))}
			</MasonryInfiniteGrid>
			{dialogMemoId && <MemoDialog lng={lng} memoId={dialogMemoId} />}
		</div>
	);
}

function MemoItemSkeleton() {
	return <Skeleton className="h-[300px] w-[300px]" />;
}
