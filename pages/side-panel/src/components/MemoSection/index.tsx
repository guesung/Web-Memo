import { useSyncLoginStatus } from "@src/hooks";
import type { MemoInput } from "@src/types/Input";
import {
	useMemoQuery,
	useSamePathMemoQuery,
	useSupabaseUserQuery,
	useTabQuery,
} from "@web-memo/shared/hooks";
import type { Database } from "@web-memo/shared/types";
import { getPageKey } from "@web-memo/shared/utils";
import { I18n } from "@web-memo/shared/utils/extension";
import { ErrorBoundary } from "@web-memo/ui";
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
	const { memos } = useMemoQuery({ url: tab?.url ?? "" });
	const { memos: samePathMemos } = useSamePathMemoQuery({
		url: tab?.url ?? "",
	});
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
		if (currentSelection?.memoId === null && memos.length === 1) {
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
		setSelection({
			scope: editorScope,
			memoId,
			memo: candidateMemos.find((candidate) => candidate.id === memoId) ?? null,
		});
	};

	const handleNewMemoClick = () => {
		setSelection({ scope: editorScope, memoId: null, memo: null });
	};

	const handleOtherMemoClick = (draft?: MemoInput) => {
		if (draft) {
			setPreservedDraft({ scope: editorScope, value: draft });
		}
		setSelection(null);
	};

	return (
		<>
			<MemoHeader memoData={activeMemo} />
			{currentDraft && <PreservedDraft draft={currentDraft} />}
			{(hasMultipleMemos || hasOnlyOtherUrlMemos || currentDraft) &&
			!currentSelection ? (
				<MemoCandidateList
					memos={memos}
					otherUrlMemos={otherUrlMemos}
					onMemoSelect={handleMemoSelect}
					onNewMemoClick={memos.length === 0 ? handleNewMemoClick : undefined}
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
