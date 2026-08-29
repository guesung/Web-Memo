"use client";

import {
	MasonryInfiniteGrid,
	type ReactInfiniteGridEvents,
} from "@egjs/react-infinitegrid";
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
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import MemoDialog from "../MemoDialog";
import { useDragSelection, useMemoDialog, useMemoSelection } from "./_hooks";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import MemoEmptyState from "./MemoEmptyState";
import MemoItem from "./MemoItem";
import MemoOptionHeader from "./MemoOptionHeader";
import MemoSearchEmptyState from "./MemoSearchEmptyState";

const CONTAINER_ID = "memo-grid";

interface MemoGridProps extends LanguageType {
	memos: GetMemoResponse[];
	searchQuery: string;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: () => void;
}

export default function MemoGrid({
	lng,
	memos,
	searchQuery,
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
			duration: 3000,
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

	const handleRequestAppend = ({
		wait,
		currentTarget,
		groupKey,
		ready,
	}: Parameters<
		NonNullable<ReactInfiniteGridEvents["onRequestAppend"]>
	>[0]) => {
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

	// 메뉴가 열려 있으면 Escape의 주인은 그 레이어다. Radix는 최상위 레이어에만 Escape를
	// 주므로 DialogContent의 onEscapeKeyDown은 아예 불리지 않고, window 리스너인
	// useKeyboardBind만 돌아 메모 상세까지 닫혀버린다.
	//
	// 판정은 눌린 순간에 해야 한다. window 버블 시점엔 Radix가 이미 메뉴를 닫아
	// data-state가 closed이고, 포퍼 래퍼로 보면 툴팁·팝오버가 걸리는 데다 닫히는
	// 애니메이션 동안 래퍼가 남아 직후의 Escape까지 삼킨다.
	const wasMenuOpenOnEscapeRef = useRef(false);

	useEffect(function trackMenuOpenOnEscape() {
		const handleDocumentKeyDownCapture = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;

			wasMenuOpenOnEscapeRef.current = !!document.querySelector(
				'[role="menu"][data-state="open"]',
			);
		};

		document.addEventListener("keydown", handleDocumentKeyDownCapture, true);
		return () => {
			document.removeEventListener(
				"keydown",
				handleDocumentKeyDownCapture,
				true,
			);
		};
	}, []);

	useKeyboardBind({
		key: "Escape",
		callback: () => {
			if (wasMenuOpenOnEscapeRef.current) return;

			closeMemoOption();
		},
	});
	useKeyboardBind({ key: "Delete", callback: handleDeleteKeyPress });
	useKeyboardBind({ key: "Backspace", callback: handleDeleteKeyPress });

	// 검색 결과가 없는 것과 메모가 하나도 없는 것은 다른 상황이다. 같은 화면을 보여주면
	// 검색 중인 사용자에게 "첫 메모를 만들어보세요"가 뜬다.
	if (memos.length === 0 && searchQuery) {
		return <MemoSearchEmptyState lng={lng} searchQuery={searchQuery} />;
	}

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
