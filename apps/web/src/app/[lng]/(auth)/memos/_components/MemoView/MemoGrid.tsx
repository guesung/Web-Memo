"use client";

import { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";
import { DragBox } from "@src/components";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	useDeleteMemosMutation,
	useKeyboardBind,
	useMemosUpsertMutation,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";

import { Loading, Skeleton, ToastAction, toast } from "@web-memo/ui";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
	type ComponentProps,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import MemoDialog from "../MemoDialog";
import { useDragSelection, useMemoDialog, useMemoSelection } from "./_hooks";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import MemoEmptyState from "./MemoEmptyState";
import MemoItem from "./MemoItem";
import MemoOptionHeader from "./MemoOptionHeader";

const CONTAINER_ID = "memo-grid";

interface MemoGridProps extends LanguageType {
	memos: GetMemoResponse[];
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: () => void;
}

export default function MemoGrid({
	lng,
	memos,
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
}: MemoGridProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();
	const searchParams = useSearchParams();
	const dragBoxRef = useRef<HTMLDivElement>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const queryClient = useQueryClient();
	const { mutate: mutateDeleteMemo } = useDeleteMemosMutation();
	const { mutate: mutateUpsertMemo } = useMemosUpsertMutation();

	const {
		selectedMemoIds,
		isSelectingMode,
		checkMemoSelected,
		handleSelectMemoItem,
		setSelectedMemoIds,
		clearSelection,
	} = useMemoSelection();

	const { dialogMemoId } = useMemoDialog();

	const { rafRef } = useDragSelection({
		containerId: CONTAINER_ID,
		dragBoxRef,
		onSelectionChange: setSelectedMemoIds,
	});

	const closeMemoOption = useCallback(() => {
		clearSelection();
		searchParams.removeAll("id");
		router.replace(searchParams.getUrl(), { scroll: false });
	}, [clearSelection, searchParams, router]);

	const selectedMemos = memos.filter((memo) =>
		selectedMemoIds.includes(memo.id),
	);

	const handleDeleteSelectedMemos = useCallback(() => {
		if (selectedMemos.length === 0) return;

		mutateDeleteMemo(selectedMemos.map((memo) => memo.id));

		const handleToastActionClick = () => {
			mutateUpsertMemo(selectedMemos);
			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
		};

		toast({
			title: t("toastTitle.memoDeleted"),
			action: (
				<ToastAction
					altText={t("toastActionMessage.undo")}
					onClick={handleToastActionClick}
				>
					{t("toastActionMessage.undo")}
				</ToastAction>
			),
		});

		setIsDeleteDialogOpen(false);
		closeMemoOption();
	}, [
		selectedMemos,
		mutateDeleteMemo,
		mutateUpsertMemo,
		queryClient,
		t,
		closeMemoOption,
	]);

	const handleDeleteKeyPress = useCallback(() => {
		if (!isSelectingMode || selectedMemoIds.length === 0) return;

		if (selectedMemoIds.length > 1) {
			setIsDeleteDialogOpen(true);
		} else {
			handleDeleteSelectedMemos();
		}
	}, [isSelectingMode, selectedMemoIds.length, handleDeleteSelectedMemos]);

	const handleRequestAppend: ComponentProps<
		typeof MasonryInfiniteGrid
	>["onRequestAppend"] = ({ wait, currentTarget, groupKey, ready }) => {
		if (hasNextPage && !isFetchingNextPage) {
			wait();

			currentTarget.appendPlaceholders(20, Number(groupKey) + 1);

			fetchNextPage();

			ready();
		}
	};

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

	useKeyboardBind({ key: "Delete", callback: handleDeleteKeyPress });
	useKeyboardBind({ key: "Backspace", callback: handleDeleteKeyPress });

	if (memos.length === 0) return <MemoEmptyState lng={lng} />;

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
			{dialogMemoId && (
				<Suspense fallback={<Loading />}>
					<MemoDialog lng={lng} memoId={dialogMemoId} />
				</Suspense>
			)}
			<DeleteConfirmDialog
				lng={lng}
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				selectedCount={selectedMemoIds.length}
				onConfirm={handleDeleteSelectedMemos}
			/>
		</div>
	);
}

function MemoItemSkeleton() {
	return <Skeleton className="h-[300px] w-[300px]" />;
}

export function MemoGridSkeleton() {
	return (
		<div className="container max-w-full pt-4">
			<div className="flex flex-wrap justify-center gap-4">
				{Array.from({ length: 12 }).map((_, index) => (
					<Skeleton
						key={index.toString()}
						className="h-[300px] w-[300px] rounded-lg"
					/>
				))}
			</div>
		</div>
	);
}
