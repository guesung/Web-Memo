import type { MemoTable } from "@web-memo/shared/types";
import type {
	MemoAutoSaveResult,
	MemoAutoSaveSnapshot,
} from "@/lib/memoAutoSaveSession";
import type { LocalMemo } from "@/lib/storage/localMemo";

/** 고정된 원래 session을 저장하고 원본 정리는 별도 단계로 반환한다. */
export async function saveMemoPanel({
	snapshot,
	pageTitle,
	favIconUrl,
	pendingLocalMemos,
	saveRemote,
	saveLocal,
	cleanupLocal,
}: SaveMemoPanelOptions): Promise<MemoAutoSaveResult> {
	const { draft, targetId, owner, url } = snapshot;
	const source = pendingLocalMemos.find(
		(memo) => memo.id === draft.pendingLocalId,
	);
	if (draft.pendingLocalId && !source) {
		throw new Error("동기화 대기 초안을 다시 확인해 주세요.");
	}
	const values = {
		url,
		title: draft.title.trim() || pageTitle || url,
		memo: draft.memo.trim(),
		impression: draft.impression.trim(),
		actionItem: draft.actionItem.trim(),
		favIconUrl: source?.favIconUrl ?? favIconUrl,
	};
	if (owner === "guest") {
		const result = await saveLocal({
			...values,
			selectedId: typeof targetId === "string" ? targetId : undefined,
			expectedNew: targetId === null,
		});
		return { id: result.id };
	}
	const createSeparate =
		targetId === null && draft.pendingSaveMode === "separate";
	const result = await saveRemote({
		...values,
		url: createSeparate ? (source?.url ?? url) : url,
		selectedId: typeof targetId === "number" ? targetId : undefined,
		createSeparate,
		expectedNew: targetId === null && !createSeparate,
		expectedOwnerId: owner,
		isWish: source?.isWish,
		isStar: source?.isStar,
		isReading: source?.isReading,
	});
	const id = result.data?.[0]?.id;
	if (typeof id !== "number")
		throw new Error("메모 저장 결과를 확인하지 못했습니다.");
	return {
		id,
		cleanup: source ? () => cleanupLocal(source.id) : undefined,
	};
}

type RemoteSaveInput = MemoTable["Insert"] & {
	selectedId?: number;
	createSeparate?: boolean;
	expectedNew?: boolean;
	expectedOwnerId?: string;
};
interface SaveMemoPanelOptions {
	snapshot: MemoAutoSaveSnapshot;
	pageTitle: string;
	favIconUrl?: string;
	pendingLocalMemos: LocalMemo[];
	saveRemote: (
		input: RemoteSaveInput,
	) => Promise<{ data: { id: number }[] | null }>;
	saveLocal: (input: {
		url: string;
		title: string;
		memo: string;
		impression: string;
		actionItem: string;
		favIconUrl?: string;
		selectedId?: string;
		expectedNew?: boolean;
	}) => Promise<{ id: string }>;
	cleanupLocal: (id: string) => Promise<void>;
}
