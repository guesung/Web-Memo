import type { useLocalMemoUpsert } from "@/lib/hooks/useLocalMemos";
import type { useMemoUpsertMutation } from "@/lib/hooks/useMemoMutation";
import type { TMemoCandidate } from "@/lib/memoCandidates";
import type { IFMemoPanelSaveSuccessOptions } from "@/lib/memoDraft";
import type { LocalMemo } from "@/lib/storage/localMemo";

/** 메모 패널 저장 입력. */
interface IFMemoPanelSaveParams {
	isChoosingMemo: boolean;
	isLoadingMemo: boolean;
	hasMemoError: boolean;
	pendingLocalId: string | null;
	pendingSaveMode: "existing" | "separate" | null;
	selectedMemo?: TMemoCandidate;
	memoText: string;
	impressionText: string;
	actionItemText: string;
	savedRevision: number;
	isLoggedIn: boolean;
	pendingLocalMemos: LocalMemo[];
	url: string;
	pageTitle: string;
	titleText: string;
	favIconUrl?: string;
	supabaseUpsert: Pick<ReturnType<typeof useMemoUpsertMutation>, "mutate">;
	localUpsert: Pick<ReturnType<typeof useLocalMemoUpsert>, "mutate">;
	savedPageVersion: number;
	onSaveSuccess: (options: IFMemoPanelSaveSuccessOptions) => Promise<boolean>;
	onSelectedMemoIdChange: (id: number | string | null) => void;
}

/** 선택한 후보와 저장 방식을 검증한 뒤 해당 저장소에 쓴다. */
export const saveMemoPanel = ({
	isChoosingMemo,
	isLoadingMemo,
	hasMemoError,
	pendingLocalId,
	pendingSaveMode,
	selectedMemo,
	memoText,
	impressionText,
	actionItemText,
	savedRevision,
	isLoggedIn,
	pendingLocalMemos,
	url,
	pageTitle,
	titleText,
	favIconUrl,
	supabaseUpsert,
	localUpsert,
	onSaveSuccess,
	onSelectedMemoIdChange,
	savedPageVersion,
}: IFMemoPanelSaveParams) => {
	if (isChoosingMemo || isLoadingMemo || hasMemoError) {
		return;
	}
	if (pendingLocalId && pendingSaveMode === null) {
		return;
	}
	if (isLoggedIn && typeof selectedMemo?.id === "string" && !pendingLocalId) {
		return;
	}
	if (!memoText.trim() && !impressionText.trim() && !actionItemText.trim()) {
		return;
	}

	if (isLoggedIn) {
		const selectedLocalId =
			typeof selectedMemo?.id === "string" ? selectedMemo.id : undefined;
		const pendingSource = pendingLocalMemos.find(
			(candidate) => candidate.id === (pendingLocalId ?? selectedLocalId),
		);
		if (pendingLocalId && !pendingSource) {
			return;
		}
		const createSeparate = pendingSaveMode === "separate";
		const payload = {
			url: createSeparate ? (pendingSource?.url ?? url) : url,
			createSeparate,
			selectedId:
				!createSeparate && typeof selectedMemo?.id === "number"
					? selectedMemo.id
					: undefined,
			title: titleText.trim() || pageTitle || url,
			memo: memoText.trim(),
			impression: impressionText.trim(),
			actionItem: actionItemText.trim(),
			favIconUrl: pendingSource?.favIconUrl ?? favIconUrl ?? null,
			isWish: pendingSource?.isWish,
			isStar: pendingSource?.isStar,
			isReading: pendingSource?.isReading,
		};
		supabaseUpsert.mutate(payload, {
			onSuccess: async (result) => {
				const nextMemoId =
					createSeparate || !selectedMemo ? result.data?.[0]?.id : undefined;
				const isCurrentPage = await onSaveSuccess({
					savedLocalId: pendingLocalId ?? selectedLocalId,
					clearSelectionDraft: !createSeparate,
					savedRevision,
					nextMemoId,
					savedPageVersion,
				});
				if (isCurrentPage && nextMemoId !== undefined) {
					onSelectedMemoIdChange(nextMemoId);
				}
			},
		});
	} else {
		const payload = {
			url,
			selectedId:
				typeof selectedMemo?.id === "string" ? selectedMemo.id : undefined,
			title: titleText.trim() || pageTitle || url,
			memo: memoText.trim(),
			impression: impressionText.trim(),
			actionItem: actionItemText.trim(),
			favIconUrl,
		};
		localUpsert.mutate(payload, {
			onSuccess: async (result) => {
				const nextMemoId = selectedMemo ? undefined : result.id;
				const isCurrentPage = await onSaveSuccess({
					savedRevision,
					nextMemoId,
					savedPageVersion,
				});
				if (isCurrentPage && nextMemoId !== undefined) {
					onSelectedMemoIdChange(nextMemoId);
				}
			},
		});
	}
};
