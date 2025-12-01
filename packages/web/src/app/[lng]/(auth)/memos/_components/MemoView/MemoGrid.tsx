"use client";

import { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";
import { DragBox } from "@src/components";
import type { LanguageType } from "@src/modules/i18n";
import { useKeyboardBind } from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";

import { Skeleton } from "@web-memo/ui";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import MemoDialog from "../MemoDialog";
import {
	useDragSelection,
	useMemoDialog,
	useMemoInfiniteScroll,
	useMemoSelection,
} from "./_hooks";
import MemoEmptyState from "./MemoEmptyState";
import MemoItem from "./MemoItem";
import MemoOptionHeader from "./MemoOptionHeader";

const CONTAINER_ID = "memo-grid";

interface MemoGridProps extends LanguageType {
	memos: GetMemoResponse[];
}

export default function MemoGrid({ lng, memos }: MemoGridProps) {
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
	} = useMemoSelection();

	const { dialogMemoId } = useMemoDialog();

	const { items, handleRequestAppend } = useMemoInfiniteScroll({
		totalMemoCount: memos.length,
	});

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

	useEffect(function closeRAFOnUnmount() {
		return () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [rafRef]);

	useKeyboardBind({ key: "Escape", callback: closeMemoOption });

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
							isMemoSelected={checkMemoSelected(memo.id)}
							selectMemoItem={handleSelectMemoItem}
							isSelectingMode={isSelectingMode}
						/>
					);
				})}
			</MasonryInfiniteGrid>
			{dialogMemoId && <MemoDialog lng={lng} memoId={dialogMemoId} />}
		</div>
	);
}

function MemoItemSkeleton() {
	return <Skeleton className="h-[300px] w-[300px]" />;
}
