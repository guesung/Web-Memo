import { useQueryClient } from "@tanstack/react-query";
import { getPageKey } from "@web-memo/shared/utils/url";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";
import { useLocalMemoUpsert } from "@/lib/hooks/useLocalMemos";
import { useMemoUpsertMutation } from "@/lib/hooks/useMemoMutation";
import { useSettingQuery } from "@/lib/hooks/useSetting";
import {
	editMemoAutoSaveSession,
	openMemoAutoSaveSession,
} from "@/lib/memoAutoSaveSession";
import type { LocalMemo } from "@/lib/storage/localMemo";
import { resolvePendingMemoSync } from "@/lib/storage/syncService";
import { connectMemoPanelDraft } from "./connectMemoPanelDraft";
import { saveMemoPanel } from "./saveMemoPanel";
import { useMemoAutoSave } from "./useMemoAutoSave";
import { useMemoPanelCandidates } from "./useMemoPanelCandidates";
import { usePendingMemoShare } from "./usePendingMemoShare";

/** 후보 조회와 자동 저장 session을 메모 패널에 연결한다. */
export function useMemoPanelState({
	url,
	pageTitle,
	favIconUrl,
	activeTabId,
	selectedMemoId,
	onSelectedMemoIdChange,
}: IFMemoPanelProps) {
	const {
		isLoggedIn,
		session: authSession,
		isLoading: isAuthLoading,
	} = useAuth();
	const queryClient = useQueryClient();
	const { isKeyboardVisible } = useKeyboardHeight();
	const { showImpression, showActionItem } = useSettingQuery(isLoggedIn);
	const candidatesState = useMemoPanelCandidates({
		url,
		isLoggedIn,
		selectedMemoId,
	});
	const {
		selectedMemo: queriedMemo,
		pendingLocalMemos,
		isChoosingMemo: isQueryChoosingMemo,
		isLoadingMemo,
		memoError,
	} = candidatesState;
	const localUpsert = useLocalMemoUpsert();
	const supabaseUpsert = useMemoUpsertMutation();
	const pageKey = url ? getPageKey(url) : "";
	const newSession = openMemoAutoSaveSession({
		owner: authSession?.user.id ?? "guest",
		tabId: activeTabId,
		pageKey,
		url,
		selectionId: null,
		targetId: null,
		draft: {
			title: pageTitle,
			memo: "",
			impression: "",
			actionItem: "",
			pendingLocalId: null,
			pendingSaveMode: null,
		},
	});
	const isNewDraftAwaitingSelection =
		selectedMemoId === null &&
		newSession.targetId === null &&
		newSession.revision > 0 &&
		candidatesState.candidates.length > 0;
	const selectedMemo = isNewDraftAwaitingSelection ? undefined : queriedMemo;
	const isChoosingMemo = isQueryChoosingMemo || isNewDraftAwaitingSelection;
	const pendingLocalId =
		isLoggedIn && typeof selectedMemo?.id === "string" ? selectedMemo.id : null;
	const selectionId = selectedMemo?.id ?? selectedMemoId;
	const targetId =
		isLoggedIn && typeof selectionId === "string" ? null : selectionId;
	const draft = {
		title: selectedMemo?.title ?? pageTitle ?? "",
		memo: selectedMemo?.memo ?? "",
		impression: selectedMemo?.impression ?? "",
		actionItem: selectedMemo?.actionItem ?? "",
		pendingLocalId,
		pendingSaveMode: null,
	};
	const autoSave = useMemoAutoSave({
		owner: authSession?.user.id ?? "guest",
		tabId: activeTabId,
		pageKey,
		url,
		selectionId,
		targetId,
		draft,
		canSave:
			!isAuthLoading &&
			!isChoosingMemo &&
			!isLoadingMemo &&
			!memoError &&
			!!url,
		save: (snapshot) => {
			if (
				snapshot.draft.pendingLocalId &&
				snapshot.draft.pendingSaveMode === null
			) {
				throw new Error("초안 저장 방식을 선택해 주세요.");
			}
			return saveMemoPanel({
				snapshot,
				pageTitle,
				favIconUrl,
				pendingLocalMemos,
				saveRemote: supabaseUpsert.mutateAsync,
				saveLocal: localUpsert.mutateAsync,
				cleanupLocal: async (id) => {
					await resolvePendingMemoSync(id);
					queryClient.invalidateQueries({ queryKey: ["localMemos"] });
					queryClient.invalidateQueries({ queryKey: ["localMemo"] });
				},
			});
		},
		onSavedId: onSelectedMemoIdChange,
	});
	const pendingShare = usePendingMemoShare({
		url,
		pageKey,
		pageTitle,
		favIconUrl,
		isLoggedIn,
		selectedMemo,
	});
	const handleSelectionChange = (id: number | string | null) => {
		autoSave.handleFlush();
		if (isNewDraftAwaitingSelection && id !== null) {
			const candidate = candidatesState.candidates.find(
				(memo) => memo.id === id,
			);
			if (!candidate) return;
			const target = openMemoAutoSaveSession({
				owner: authSession?.user.id ?? "guest",
				tabId: activeTabId,
				pageKey,
				url,
				selectionId: id,
				targetId: isLoggedIn && typeof id === "string" ? null : id,
				draft: {
					title: candidate.title ?? pageTitle,
					memo: candidate.memo ?? "",
					impression: candidate.impression ?? "",
					actionItem: candidate.actionItem ?? "",
					pendingLocalId: isLoggedIn && typeof id === "string" ? id : null,
					pendingSaveMode: null,
				},
			});
			connectMemoPanelDraft({ source: newSession, target });
		}
		onSelectedMemoIdChange(id);
	};
	const handlePendingLocalSelect = (candidate: LocalMemo) => {
		autoSave.handleFlush();
		const sourceSession = openMemoAutoSaveSession({
			owner: authSession?.user.id ?? "guest",
			tabId: activeTabId,
			pageKey,
			url,
			selectionId: candidate.id,
			targetId: null,
			draft: { ...draft, pendingLocalId: candidate.id },
		});
		if (sourceSession.revision === 0)
			editMemoAutoSaveSession(sourceSession, {
				title: candidate.title,
				memo: candidate.memo,
				impression: candidate.impression ?? "",
				actionItem: candidate.actionItem ?? "",
				pendingLocalId: candidate.id,
				pendingSaveMode: null,
				pendingTargetId:
					typeof autoSave.targetId === "number" ? autoSave.targetId : null,
			});
		onSelectedMemoIdChange(candidate.id);
	};
	const markDraftChanged = (
		field: "title" | "memo" | "impression" | "actionItem",
		value: string,
	) => {
		autoSave.handleEdit({ [field]: value });
	};

	return {
		...candidatesState,
		selectedMemo,
		isChoosingMemo,
		...pendingShare,
		...autoSave,
		handleSelectionChange,
		handlePendingLocalSelect,
		pendingLocalId: autoSave.draft.pendingLocalId,
		pendingSaveMode: autoSave.draft.pendingSaveMode,
		pendingTargetId: autoSave.draft.pendingTargetId,
		setPendingSaveMode: (mode: "existing" | "separate") =>
			autoSave.handleEdit({
				pendingSaveMode: mode,
				title: autoSave.draft.title,
			}),
		titleText: autoSave.draft.title,
		memoText: autoSave.draft.memo,
		impressionText: autoSave.draft.impression,
		actionItemText: autoSave.draft.actionItem,
		markDraftChanged,
		isKeyboardVisible,
		showImpression,
		showActionItem,
	};
}

export interface IFMemoPanelProps {
	url: string;
	pageTitle: string;
	favIconUrl?: string;
	activeTabId: string;
	onClose?: () => void;
	selectedMemoId: number | string | null;
	onSelectedMemoIdChange: (id: number | string | null) => void;
}
