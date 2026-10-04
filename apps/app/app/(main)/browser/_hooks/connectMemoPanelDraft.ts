import {
	discardMemoAutoSaveSession,
	editMemoAutoSaveSession,
	isMemoAutoSaveDirty,
	type MemoAutoSaveSession,
} from "@/lib/memoAutoSaveSession";

/** 사용자가 선택한 대상에 보류 초안을 연결하되 대상의 미저장 편집을 덮어쓰지 않는다. */
export function connectMemoPanelDraft({
	source,
	target,
}: {
	source: MemoAutoSaveSession;
	target: MemoAutoSaveSession;
}) {
	if (
		!source.active ||
		!target.active ||
		source.isSaving ||
		source.owner !== target.owner ||
		source.tabId !== target.tabId ||
		source.pageKey !== target.pageKey ||
		isMemoAutoSaveDirty(target)
	)
		return false;
	editMemoAutoSaveSession(target, {
		...source.draft,
		pendingLocalId: target.draft.pendingLocalId,
		pendingSaveMode: target.draft.pendingSaveMode,
		pendingTargetId: target.draft.pendingTargetId,
	});
	discardMemoAutoSaveSession(source);
	return true;
}
