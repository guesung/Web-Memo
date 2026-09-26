import { useQueryClient } from "@tanstack/react-query";
import { getPageKey } from "@web-memo/shared/utils/url";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";
import { useLocalMemoUpsert } from "@/lib/hooks/useLocalMemos";
import { useMemoUpsertMutation } from "@/lib/hooks/useMemoMutation";
import { useSettingQuery } from "@/lib/hooks/useSetting";
import {
	createEmptyMemoPanelDraft,
	type IFMemoPanelDraft,
	type IFMemoPanelSaveSuccessOptions,
	selectMemoCandidate,
} from "@/lib/memoDraft";
import type { LocalMemo } from "@/lib/storage/localMemo";
import { completeMemoPanelSave } from "./completeMemoPanelSave";
import { saveMemoPanel } from "./saveMemoPanel";
import { useMemoPanelCandidates } from "./useMemoPanelCandidates";
import { usePendingMemoShare } from "./usePendingMemoShare";
/** 메모 패널 입력. */
export interface IFMemoPanelProps {
	url: string;
	pageTitle: string;
	favIconUrl?: string;
	onClose?: () => void;
	selectedMemoId: number | string | null;
	onSelectedMemoIdChange: (id: number | string | null) => void;
}
/** 페이지 후보, 편집 초안, 저장 상태를 메모 패널에 연결한다. */
export function useMemoPanelState({
	url,
	pageTitle,
	favIconUrl,
	selectedMemoId,
	onSelectedMemoIdChange,
}: IFMemoPanelProps) {
	const { isLoggedIn } = useAuth();
	const queryClient = useQueryClient();
	const [titleText, setTitleText] = useState("");
	const [memoText, setMemoText] = useState("");
	const [impressionText, setImpressionText] = useState("");
	const [actionItemText, setActionItemText] = useState("");
	const [saved, setSaved] = useState(false);
	const [pendingLocalId, setPendingLocalId] = useState<string | null>(null);
	const [pendingSaveMode, setPendingSaveMode] = useState<
		"existing" | "separate" | null
	>(null);
	const { isKeyboardVisible } = useKeyboardHeight();
	const { showImpression, showActionItem } = useSettingQuery(isLoggedIn);
	const {
		pendingLocalMemos,
		candidates,
		selectedMemo,
		isChoosingMemo,
		isLoadingMemo,
		memoError,
	} = useMemoPanelCandidates({ url, isLoggedIn, selectedMemoId });
	const localUpsert = useLocalMemoUpsert();
	const supabaseUpsert = useMemoUpsertMutation();
	const isPending = isLoggedIn
		? supabaseUpsert.isPending
		: localUpsert.isPending;
	const justSavedRef = useRef(false);
	const editRevisionRef = useRef(0);
	const latestDraftRef = useRef<IFMemoPanelDraft>(createEmptyMemoPanelDraft());
	latestDraftRef.current = {
		title: titleText,
		memo: memoText,
		impression: impressionText,
		actionItem: actionItemText,
		pendingLocalId,
		pendingSaveMode,
	};
	const hasDraftRef = useRef(false);
	const draftsRef = useRef(new Map<string, IFMemoPanelDraft>());
	const pageKey = url ? getPageKey(url) : "";
	const currentPageScopeRef = useRef({ pageKey, version: 0 });
	if (currentPageScopeRef.current.pageKey !== pageKey) {
		currentPageScopeRef.current = {
			pageKey,
			version: currentPageScopeRef.current.version + 1,
		};
	}
	const { hasPendingShare, handlePendingShareApply, isPendingShareApply } =
		usePendingMemoShare({
			url,
			pageKey,
			pageTitle,
			favIconUrl,
			isLoggedIn,
			selectedMemo,
		});
	const previousPageKeyRef = useRef(pageKey);
	const selectionKey =
		selectedMemoId === null
			? candidates.length === 1
				? String(candidates[0].id)
				: "new"
			: String(selectedMemoId);
	const previousSelectionKeyRef = useRef(selectionKey);
	const markDraftChanged = (
		field: "title" | "memo" | "impression" | "actionItem",
		value: string,
	) => {
		editRevisionRef.current += 1;
		latestDraftRef.current[field] = value;
		hasDraftRef.current = true;
	};
	const handleSelectionChange = (id: number | string | null) => {
		selectMemoCandidate({
			id,
			isPending,
			hasDraft: hasDraftRef.current,
			drafts: draftsRef.current,
			selectionKey,
			latestDraft: latestDraftRef.current,
			isLoggedIn,
			setPendingLocalId,
			setPendingSaveMode,
			onSelectedMemoIdChange,
		});
	};

	useEffect(() => {
		if (isLoggedIn && typeof selectedMemo?.id === "string") {
			setPendingLocalId(selectedMemo.id);
		}
	}, [isLoggedIn, selectedMemo?.id]);

	useEffect(() => {
		if (previousPageKeyRef.current !== pageKey) {
			previousPageKeyRef.current = pageKey;
			draftsRef.current.clear();
			setSaved(false);
			justSavedRef.current = false;
			hasDraftRef.current = false;
			setPendingLocalId(null);
			setPendingSaveMode(null);
		}
		if (previousSelectionKeyRef.current !== selectionKey) {
			previousSelectionKeyRef.current = selectionKey;
			const draft = draftsRef.current.get(selectionKey);
			hasDraftRef.current = Boolean(draft);
			setPendingLocalId(
				draft?.pendingLocalId ??
					(isLoggedIn && typeof selectedMemo?.id === "string"
						? selectedMemo.id
						: null),
			);
			setPendingSaveMode(draft?.pendingSaveMode ?? null);
			setTitleText(draft?.title ?? selectedMemo?.title ?? pageTitle ?? "");
			setMemoText(draft?.memo ?? selectedMemo?.memo ?? "");
			setImpressionText(draft?.impression ?? selectedMemo?.impression ?? "");
			setActionItemText(draft?.actionItem ?? selectedMemo?.actionItem ?? "");
			setSaved(false);
			return;
		}

		if (hasDraftRef.current && previousPageKeyRef.current === pageKey) {
			return;
		}
		setTitleText(selectedMemo?.title ?? pageTitle ?? "");
		if (selectedMemo?.memo) {
			setMemoText(selectedMemo.memo);
		} else {
			setMemoText("");
		}
		setImpressionText(selectedMemo?.impression ?? "");
		setActionItemText(selectedMemo?.actionItem ?? "");
		if (!justSavedRef.current) {
			setSaved(false);
		}
	}, [
		selectedMemo?.title,
		selectedMemo?.memo,
		selectedMemo?.impression,
		selectedMemo?.actionItem,
		selectedMemo?.id,
		isLoggedIn,
		pageTitle,
		pageKey,
		selectionKey,
	]);

	const onSaveSuccess = (options: IFMemoPanelSaveSuccessOptions) =>
		completeMemoPanelSave({
			options,
			getPageVersion: () => currentPageScopeRef.current.version,
			getRevision: () => editRevisionRef.current,
			getLatestDraft: () => latestDraftRef.current,
			drafts: draftsRef.current,
			selectionKey,
			onLocalResolved: (isCurrentPage) => {
				queryClient.invalidateQueries({ queryKey: ["localMemos"] });
				queryClient.invalidateQueries({ queryKey: ["localMemo"] });
				if (isCurrentPage) {
					setPendingLocalId(null);
					setPendingSaveMode(null);
				}
			},
			onDraftRetained: () => {
				hasDraftRef.current = true;
				setSaved(false);
			},
			onSaved: () => {
				justSavedRef.current = true;
				hasDraftRef.current = false;
				setSaved(true);
				setTimeout(() => {
					if (
						currentPageScopeRef.current.version === options.savedPageVersion
					) {
						setSaved(false);
						justSavedRef.current = false;
					}
				}, 2000);
			},
		});

	const handlePendingLocalSelect = (candidate: LocalMemo) => {
		if (isPending) {
			return;
		}
		if (hasDraftRef.current) {
			draftsRef.current.set(selectionKey, {
				title: titleText,
				memo: memoText,
				impression: impressionText,
				actionItem: actionItemText,
				pendingLocalId,
				pendingSaveMode,
			});
		}
		setPendingLocalId(candidate.id);
		setPendingSaveMode(null);
		setTitleText(candidate.title);
		setMemoText(candidate.memo);
		setImpressionText(candidate.impression ?? "");
		setActionItemText(candidate.actionItem ?? "");
		hasDraftRef.current = true;
	};

	const handleSave = () =>
		saveMemoPanel({
			isChoosingMemo,
			isLoadingMemo,
			hasMemoError: Boolean(memoError),
			pendingLocalId,
			pendingSaveMode,
			selectedMemo,
			memoText,
			impressionText,
			actionItemText,
			savedRevision: editRevisionRef.current,
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
			savedPageVersion: currentPageScopeRef.current.version,
		});

	return {
		pendingLocalMemos,
		hasPendingShare,
		candidates,
		isPending,
		handleSelectionChange,
		selectedMemo,
		handlePendingLocalSelect,
		pendingLocalId,
		pendingSaveMode,
		setPendingSaveMode,
		handlePendingShareApply,
		isPendingShareApply,
		hasDraftRef,
		titleText,
		markDraftChanged,
		setTitleText,
		isKeyboardVisible,
		saved,
		handleSave,
		showImpression,
		showActionItem,
		memoText,
		setMemoText,
		impressionText,
		setImpressionText,
		actionItemText,
		setActionItemText,
		isLoadingMemo,
		memoError,
		isChoosingMemo,
	};
}
