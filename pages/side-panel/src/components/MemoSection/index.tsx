import {
	useOfflineMemoSync,
	useOnlineStatus,
	useSyncLoginStatus,
} from "@src/hooks";
import type { MemoInput } from "@src/types/Input";
import type { IFOfflineMemoConflict } from "@src/utils/offlineMemoQueue";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	useDeleteMemosMutation,
	useMemoQuery,
	useRestoreMemosMutation,
	useSamePathMemoQuery,
	useSupabaseUserQuery,
	useTabQuery,
} from "@web-memo/shared/hooks";
import type { Database } from "@web-memo/shared/types";
import { getPageKey } from "@web-memo/shared/utils";
import { I18n } from "@web-memo/shared/utils/extension";
import { ErrorBoundary, ToastAction, toast } from "@web-memo/ui";
import { Suspense, useEffect, useRef, useState } from "react";
import LoginSection from "../LoginSection";
import NoticeBanner from "../NoticeBanner";
import MemoCandidateList from "./components/MemoCandidateList";
import MemoForm from "./components/MemoForm";
import { MemoFormSkeleton } from "./components/MemoForm/components";
import MemoHeader from "./components/MemoHeader";

/** 사이드 패널의 현재 페이지 메모와 후보 선택을 표시한다. */
export default function MemoSection({ memoHeight }: MemoSectionProps) {
	const loginBoundaryRef = useRef<ErrorBoundary>(null);

	useSyncLoginStatus(loginBoundaryRef);

	return (
		<section
			// 입력창이 이 경계에 딱 붙어 포커스 링(1px)이 좌우로 잘린다.
			// 세로는 form 의 py-1 덕에 살아남아 좌우만 안 보였다.
			className="flex flex-col overflow-hidden px-0.5"
			style={{ height: `${memoHeight}%` }}
		>
			<NoticeBanner />
			<ErrorBoundary ref={loginBoundaryRef} FallbackComponent={LoginSection}>
				<Suspense fallback={<MemoFormSkeleton />}>
					<MemoSectionContent />
				</Suspense>
			</ErrorBoundary>
		</section>
	);
}

const MemoSectionContent = () => {
	const { user } = useSupabaseUserQuery();

	if (!user?.data.user) {
		return <LoginSection />;
	}

	return <AuthenticatedMemoSectionContent />;
};

const AuthenticatedMemoSectionContent = () => {
	const { data: tab } = useTabQuery();
	const { user } = useSupabaseUserQuery();
	const userId = user.data.user?.id;
	const { memos } = useMemoQuery({ url: tab?.url ?? "" });
	const queryClient = useQueryClient();
	const { mutate: deleteMemos } = useDeleteMemosMutation();
	const { mutate: restoreMemos } = useRestoreMemosMutation();
	const { memos: samePathMemos } = useSamePathMemoQuery({
		url: tab?.url ?? "",
	});
	const isOnline = useOnlineStatus();
	// handleUndoClick은 삭제 시점에 한 번 만들어져 토스트에 붙는다. 그 사이 오프라인으로
	// 바뀌어도 최신 상태를 보도록 값이 아니라 ref로 읽는다.
	const isOnlineRef = useRef(isOnline);
	isOnlineRef.current = isOnline;
	// 쿼리만 다른 주소에 남긴 메모. 현재 주소에 메모가 없을 때도 고를 수 있게 후보로 보여 준다.
	const otherUrlMemos = samePathMemos.filter(
		(samePathMemo) => !memos.some((memo) => memo.id === samePathMemo.id),
	);
	const hasOnlyOtherUrlMemos = memos.length === 0 && otherUrlMemos.length > 0;
	const pageKey = tab?.url ? getPageKey(tab.url) : "";
	const editorScope = `${tab?.id}:${pageKey}`;
	const [selection, setSelection] = useState<{
		scope: string;
		memoId: number | null;
		memo: Database["memo"]["Tables"]["memo"]["Row"] | null;
	} | null>(null);
	const [preservedDraft, setPreservedDraft] = useState<{
		scope: string;
		value: MemoInput;
	} | null>(null);
	// 사용자가 "다른 메모 선택"으로 목록을 직접 요청한 페이지. 이 페이지에서는 메모를 자동으로 고르지 않는다.
	const [candidateListScope, setCandidateListScope] = useState<string | null>(
		null,
	);
	const isCandidateListRequested = candidateListScope === editorScope;
	const currentSelection = selection?.scope === editorScope ? selection : null;
	const currentDraft =
		preservedDraft?.scope === editorScope ? preservedDraft.value : null;

	useEffect(() => {
		if (selection && selection.scope !== editorScope) {
			setSelection(null);
			setPreservedDraft(null);
			return;
		}
		// 현재 주소에 메모가 없고 다른 주소의 메모만 있으면 자동으로 고르지 않고 후보 화면을 띄운다.
		if (
			!selection &&
			!currentDraft &&
			!isCandidateListRequested &&
			memos.length <= 1 &&
			!hasOnlyOtherUrlMemos
		) {
			setSelection({
				scope: editorScope,
				memoId: memos[0]?.id ?? null,
				memo: memos[0] ?? null,
			});
			return;
		}
		if (
			currentSelection?.memoId === null &&
			memos.length === 1 &&
			!isCandidateListRequested
		) {
			setSelection({
				...currentSelection,
				memoId: memos[0].id,
				memo: memos[0],
			});
		}
	}, [
		selection,
		currentSelection,
		currentDraft,
		editorScope,
		memos,
		hasOnlyOtherUrlMemos,
		isCandidateListRequested,
	]);

	const candidateMemos = [...memos, ...otherUrlMemos];
	const selectedMemo = candidateMemos.find(
		(candidate) => candidate.id === currentSelection?.memoId,
	);
	const activeMemo = currentSelection
		? (selectedMemo ?? currentSelection.memo ?? undefined)
		: !currentDraft && memos.length === 1
			? memos[0]
			: undefined;
	const hasMultipleMemos = memos.length > 1;
	const isSelectedMemoMissing =
		currentSelection?.memoId !== null &&
		currentSelection?.memoId !== undefined &&
		!selectedMemo;
	const hasUnselectedCollision =
		currentSelection?.memoId === null && memos.length > 1;

	const openCandidateList = () => {
		setCandidateListScope(editorScope);
		setSelection(null);
	};

	/**
	 * 대기열 flush 도중 다른 메모로 새로 저장된(충돌) 항목을 처리한다.
	 * @description 지금 편집 중인 메모가 충돌한 경우에만 편집기를 새 메모로 전환하고 토스트를 띄운다.
	 * 편집 중이 아닌 메모의 충돌은 화면에 알리지 않고 캐시 무효화로만 반영한다.
	 */
	const handleOfflineMemoConflict = (conflict: IFOfflineMemoConflict) => {
		const isEditingConflictedMemo =
			currentSelection !== null &&
			currentSelection.memoId === (conflict.oldMemoId ?? null);

		if (!isEditingConflictedMemo) {
			return;
		}

		setSelection({
			scope: editorScope,
			memoId: conflict.newMemoId,
			memo: null,
		});

		toast({
			title: I18n.get("memo_offline_conflict"),
			action: (
				<ToastAction
					altText={I18n.get("memo_choose_other")}
					onClick={openCandidateList}
				>
					{I18n.get("memo_choose_other")}
				</ToastAction>
			),
		});
	};

	const { syncStatus, retrySync } = useOfflineMemoSync({
		userId,
		onConflict: handleOfflineMemoConflict,
	});
	const isSyncing = syncStatus === "syncing";
	const isSyncFailed = syncStatus === "syncFailed";

	const handleMemoSelect = (memoId: number) => {
		setCandidateListScope(null);
		setSelection({
			scope: editorScope,
			memoId,
			memo: candidateMemos.find((candidate) => candidate.id === memoId) ?? null,
		});
	};

	// 사이드 패널의 메모 조회 키(["memo", ...])는 memos() 무효화에 걸리지 않아 따로 무효화한다.
	// 다른 주소의 메모도 지울 수 있으므로 같은 경로의 후보 목록도 함께 무효화한다.
	const invalidateCurrentPageMemos = async () => {
		await queryClient.invalidateQueries({
			queryKey: QUERY_KEY.memo({ url: pageKey }),
		});
		await queryClient.invalidateQueries({
			queryKey: QUERY_KEY.samePathMemosPrefix(),
		});
	};

	const handleMemoDelete = (memoId: number) => {
		if (!isOnline || isSyncing) {
			return;
		}

		deleteMemos([memoId], { onSettled: invalidateCurrentPageMemos });

		const handleUndoClick = () => {
			// 토스트가 떠 있는 사이 오프라인으로 바뀌었을 수 있어 클릭 시점의 값을 ref로 읽는다.
			if (!isOnlineRef.current) {
				return;
			}

			restoreMemos([memoId], { onSettled: invalidateCurrentPageMemos });
		};

		toast({
			title: I18n.get("memo_candidates_deleted"),
			action: (
				<ToastAction altText={I18n.get("undo")} onClick={handleUndoClick}>
					{I18n.get("undo")}
				</ToastAction>
			),
		});
	};

	const handleNewMemoClick = () => {
		setCandidateListScope(null);
		setSelection({ scope: editorScope, memoId: null, memo: null });
	};

	const handleOtherMemoClick = (draft?: MemoInput) => {
		if (draft) {
			setPreservedDraft({ scope: editorScope, value: draft });
		}
		openCandidateList();
	};

	return (
		<>
			<MemoHeader
				memoData={activeMemo}
				isOffline={!isOnline}
				isSyncing={isSyncing}
			/>
			{currentDraft && <PreservedDraft draft={currentDraft} />}
			{(hasMultipleMemos ||
				hasOnlyOtherUrlMemos ||
				isCandidateListRequested ||
				currentDraft) &&
			!currentSelection ? (
				<MemoCandidateList
					memos={memos}
					otherUrlMemos={otherUrlMemos}
					onMemoSelect={handleMemoSelect}
					onNewMemoClick={memos.length === 0 ? handleNewMemoClick : undefined}
					onMemoDelete={handleMemoDelete}
					isOffline={!isOnline}
					isSyncing={isSyncing}
				/>
			) : (
				<MemoForm
					key={editorScope}
					selectedMemo={activeMemo}
					isSelectedMemoMissing={
						isSelectedMemoMissing || hasUnselectedCollision
					}
					onOtherMemoClick={
						hasMultipleMemos ||
						otherUrlMemos.length > 0 ||
						isSelectedMemoMissing
							? handleOtherMemoClick
							: undefined
					}
					isSyncing={isSyncing}
					isSyncFailed={isSyncFailed}
					onRetrySync={retrySync}
				/>
			)}
		</>
	);
};

const PreservedDraft = ({ draft }: { draft: MemoInput }) => (
	<details className="rounded-md border p-2 text-xs">
		<summary>{I18n.get("memo_candidates_preserved_draft")}</summary>
		<pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words">
			{[draft.title, draft.memo, draft.impression, draft.actionItem]
				.filter(Boolean)
				.join("\n\n")}
		</pre>
	</details>
);

interface MemoSectionProps {
	memoHeight: number;
}
