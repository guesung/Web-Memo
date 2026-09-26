/** 메모 패널에서 선택별로 보관하는 편집 초안. */
export interface IFMemoPanelDraft {
	title: string;
	memo: string;
	impression: string;
	actionItem: string;
	pendingLocalId: string | null;
	pendingSaveMode: "existing" | "separate" | null;
}

/** 메모 저장 성공 후 현재 방문과 새 입력을 처리하는 값. */
export interface IFMemoPanelSaveSuccessOptions {
	savedLocalId?: string;
	clearSelectionDraft?: boolean;
	savedRevision: number;
	nextMemoId?: number | string;
	savedPageVersion: number;
}

/** 새 페이지에서 사용할 빈 편집 초안을 만든다. */
export const createEmptyMemoPanelDraft = (): IFMemoPanelDraft => ({
	title: "",
	memo: "",
	impression: "",
	actionItem: "",
	pendingLocalId: null,
	pendingSaveMode: null,
});

/** 후보 전환 전에 현재 초안을 남기고 보류 원본을 새 후보에 넘기지 않는다. */
export const selectMemoCandidate = ({
	id,
	isPending,
	hasDraft,
	drafts,
	selectionKey,
	latestDraft,
	isLoggedIn,
	setPendingLocalId,
	setPendingSaveMode,
	onSelectedMemoIdChange,
}: {
	id: number | string | null;
	isPending: boolean;
	hasDraft: boolean;
	drafts: Map<string, IFMemoPanelDraft>;
	selectionKey: string;
	latestDraft: IFMemoPanelDraft;
	isLoggedIn: boolean;
	setPendingLocalId: (id: string | null) => void;
	setPendingSaveMode: (mode: "existing" | "separate" | null) => void;
	onSelectedMemoIdChange: (id: number | string | null) => void;
}): void => {
	if (isPending) {
		return;
	}
	if (hasDraft) {
		drafts.set(selectionKey, { ...latestDraft });
	}
	setPendingLocalId(typeof id === "string" && isLoggedIn ? id : null);
	setPendingSaveMode(null);
	onSelectedMemoIdChange(id);
};

/** 저장 요청 이후 생긴 입력을 새 메모 ID에 연결해 유지한다. */
export const retainPostSaveEdits = ({
	savedRevision,
	currentRevision,
	latestDraft,
	selectionKey,
	nextMemoId,
	drafts,
}: {
	savedRevision: number;
	currentRevision: number;
	latestDraft: IFMemoPanelDraft;
	selectionKey: string;
	nextMemoId?: number | string;
	drafts: Map<string, IFMemoPanelDraft>;
}): boolean => {
	if (savedRevision === currentRevision) {
		return false;
	}

	drafts.set(String(nextMemoId ?? selectionKey), {
		...latestDraft,
		pendingLocalId: null,
		pendingSaveMode: null,
	});

	return true;
};
