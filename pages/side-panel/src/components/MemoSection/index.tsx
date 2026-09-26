import { useSyncLoginStatus } from "@src/hooks";
import type { MemoInput } from "@src/types/Input";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	categoryQueryOptions,
	memoQueryOptions,
	samePathMemoQueryOptions,
	settingQueryOptions,
	supabaseClientQueryOptions,
	useDeleteMemosMutation,
	useRestoreMemosMutation,
	userQueryOptions,
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
import useMemoCandidatesQuery from "./hooks/useMemoCandidatesQuery";

/** 사이드 패널의 현재 페이지 메모와 후보 선택을 표시한다. */
export default function MemoSection({ memoHeight }: MemoSectionProps) {
	const loginBoundaryRef = useRef<ErrorBoundary>(null);
	const queryClient = useQueryClient();
	const { data: tab } = useTabQuery();

	useSyncLoginStatus(loginBoundaryRef);

	// user·setting·category는 로그인 상태에서만 한 번 준비하면 되므로 tab.url과 무관하게 둔다.
	useEffect(
		function prefetchUserSettingCategory() {
			const prefetch = async () => {
				try {
					const supabaseClient = await queryClient.ensureQueryData(
						supabaseClientQueryOptions(),
					);

					await Promise.all([
						queryClient.prefetchQuery(userQueryOptions(supabaseClient)),
						queryClient.prefetchQuery(settingQueryOptions(supabaseClient)),
						queryClient.prefetchQuery(categoryQueryOptions(supabaseClient)),
					]);
				} catch {
					// 세션이 없어 클라이언트를 준비하지 못하면 폼 안 Suspense 경로(LoginSection)가 처리한다.
				}
			};

			void prefetch();
		},
		[queryClient],
	);

	// 탭 url이 바뀌면 메모 후보와 같은 경로 후보만 다시 prefetch한다. user·setting·category는 그대로 재사용한다.
	useEffect(
		function prefetchMemo() {
			const prefetch = async () => {
				try {
					const supabaseClient = await queryClient.ensureQueryData(
						supabaseClientQueryOptions(),
					);

					const url = tab?.url ?? "";

					await Promise.all([
						queryClient.prefetchQuery(
							memoQueryOptions({ supabaseClient, url }),
						),
						queryClient.prefetchQuery(
							samePathMemoQueryOptions({ supabaseClient, url }),
						),
					]);
				} catch {
					// 세션이 없어 클라이언트를 준비하지 못하면 폼 안 Suspense 경로(LoginSection)가 처리한다.
				}
			};

			void prefetch();
		},
		[queryClient, tab?.url],
	);

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
	// 후보 조회를 기다리는 동안 폼 전체를 스켈레톤으로 바꾸지 않도록 Suspense 없이 읽는다.
	const {
		memos,
		samePathMemos,
		isMemoLocked,
		isMemoLoadFailed,
		refetchMemoCandidates,
	} = useMemoCandidatesQuery({ url: tab?.url ?? "" });
	const queryClient = useQueryClient();
	const { mutate: deleteMemos } = useDeleteMemosMutation();
	const { mutate: restoreMemos } = useRestoreMemosMutation();
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
		// 후보가 아직 없으면(대기·실패) 빈 목록을 "메모 없음"으로 오판해 새 메모를 고르지 않도록 기다린다.
		if (isMemoLocked) {
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
		isMemoLocked,
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
		deleteMemos([memoId], { onSettled: invalidateCurrentPageMemos });

		const handleUndoClick = () => {
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
		setCandidateListScope(editorScope);
		setSelection(null);
	};

	// 후보를 받기 전에는 목록·선택 로직을 돌리지 않고 잠긴 폼을 그린다. key가 같아 도착 뒤에도 같은 폼을 이어 쓴다.
	if (isMemoLocked) {
		return (
			<>
				<MemoHeader />
				<MemoForm
					key={editorScope}
					isMemoLocked
					isMemoLoadFailed={isMemoLoadFailed}
					onMemoRetryClick={refetchMemoCandidates}
				/>
			</>
		);
	}

	return (
		<>
			<MemoHeader memoData={activeMemo} />
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
