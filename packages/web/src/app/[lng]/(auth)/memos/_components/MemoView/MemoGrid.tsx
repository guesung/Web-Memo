"use client";

import { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";
import { DragBox } from "@src/components";
import { useDrag } from "@src/hooks";
import type { LanguageType } from "@src/modules/i18n";
import { useCategoryQuery, useKeyboardBind } from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { Skeleton } from "@web-memo/ui";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import MemoDialog from "../MemoDialog";
import MemoEmptyState from "./MemoEmptyState";
import MemoItem from "./MemoItem";
import MemoOptionHeader from "./MemoOptionHeader";
import { useDragSelection } from "./hooks/useDragSelection";
import { useInfiniteGrid } from "./hooks/useInfiniteGrid";
import { useMemoDialog } from "./hooks/useMemoDialog";
import { useMemoSelection } from "./hooks/useMemoSelection";

const CONTAINER_ID = "memo-grid";

interface MemoGridProps extends LanguageType {
	memos: GetMemoResponse[];
}

export default function MemoGrid({ lng, memos }: MemoGridProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const dragBoxRef = useRef<HTMLDivElement>(null);
	const { categories } = useCategoryQuery();

	// Memo selection state
	const {
		selectedMemos,
		isSelectingMode,
		isMemoSelected,
		toggleMemoSelection,
		setSelectedIds,
		clearSelection,
	} = useMemoSelection({ memos });

	// Infinite grid state
	const { items, handleRequestAppend } = useInfiniteGrid({
		totalItemsCount: memos.length,
	});

	// Dialog state
	const { dialogMemoId } = useMemoDialog();

	// Drag selection behavior
	const { handleMouseDown, cleanup: cleanupDragSelection } = useDragSelection({
		containerId: CONTAINER_ID,
		dragBoxRef,
		onSelectionChange: setSelectedIds,
	});

	useDrag({ onMouseDown: handleMouseDown });

	const handleCloseMemoOption = () => {
		clearSelection();
		searchParams.removeAll("id");
		router.replace(searchParams.getUrl(), { scroll: false });
	};

	useEffect(
		function cleanupDragSelectionOnUnmount() {
			return cleanupDragSelection;
		},
		[cleanupDragSelection],
	);

	useKeyboardBind({ key: "Escape", callback: handleCloseMemoOption });

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
						onXButtonClick={handleCloseMemoOption}
						closeMemoOption={handleCloseMemoOption}
						categories={categories ?? []}
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
				{items.map((item) => {
					const memo = memos.at(item.key);
					if (!memo) return null;

					return (
						<MemoItem
							key={memo.id}
							lng={lng}
							data-grid-groupkey={item.groupKey}
							memo={memo}
							isMemoSelected={isMemoSelected(memo.id)}
							selectMemoItem={toggleMemoSelection}
							isSelectingMode={isSelectingMode}
						/>
					);
				})}
			</MasonryInfiniteGrid>

			{dialogMemoId && (
				<Suspense>
					<MemoDialog lng={lng} memoId={dialogMemoId} />
				</Suspense>
			)}
		</div>
	);
}

function MemoItemSkeleton() {
	return <Skeleton className="h-[300px] w-[300px]" />;
}
