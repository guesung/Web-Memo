import {
	type IFMemoPanelDraft,
	type IFMemoPanelSaveSuccessOptions,
	retainPostSaveEdits,
} from "@/lib/memoDraft";
import { resolvePendingMemoSync } from "@/lib/storage/syncService";

/** 저장 완료 시 현재 방문에 속한 추가 입력만 초안으로 유지한다. */
export const completeMemoPanelSave = async ({
	options,
	getPageVersion,
	getRevision,
	getLatestDraft,
	drafts,
	selectionKey,
	onLocalResolved,
	onDraftRetained,
	onSaved,
}: {
	options: IFMemoPanelSaveSuccessOptions;
	getPageVersion: () => number;
	getRevision: () => number;
	getLatestDraft: () => IFMemoPanelDraft;
	drafts: Map<string, IFMemoPanelDraft>;
	selectionKey: string;
	onLocalResolved: (isCurrentPage: boolean) => void;
	onDraftRetained: () => void;
	onSaved: () => void;
}): Promise<boolean> => {
	const { savedLocalId, savedRevision, savedPageVersion, nextMemoId } = options;
	if (savedLocalId) {
		await resolvePendingMemoSync(savedLocalId);
		onLocalResolved(getPageVersion() === savedPageVersion);
	}
	if (getPageVersion() !== savedPageVersion) {
		return false;
	}
	const hasNewEdits = retainPostSaveEdits({
		savedRevision,
		currentRevision: getRevision(),
		latestDraft: getLatestDraft(),
		selectionKey,
		nextMemoId,
		drafts,
	});
	if (options.clearSelectionDraft !== false && !hasNewEdits) {
		drafts.delete(selectionKey);
	}
	if (hasNewEdits) {
		onDraftRetained();
		return true;
	}
	onSaved();
	return true;
};
