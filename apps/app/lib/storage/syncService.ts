import AsyncStorage from "@react-native-async-storage/async-storage";
import { MemoService } from "@web-memo/shared/utils/services";
import { getPageKey } from "@web-memo/shared/utils/url";
import { supabase } from "@/lib/supabase/client";
import { clearSyncedMemos, getUnsyncedMemos, markAsSynced } from "./localMemo";

const PENDING_MEMO_SYNCS_KEY = "webmemo:pendingMemoSyncs";
const memoService = new MemoService(supabase);

/** 로그인 후에도 남겨 두는 메모 동기화 보류 항목. */
export interface IFPendingMemoSync {
	localId: string;
	url: string;
	operation: "sync";
	reason: "multiple-local" | "remote-candidate" | "save-error";
}

/** 사용자가 직접 저장 대상을 선택해야 하는 동기화 항목을 조회한다. */
export const getPendingMemoSyncs = async (): Promise<IFPendingMemoSync[]> => {
	const stored = await AsyncStorage.getItem(PENDING_MEMO_SYNCS_KEY);
	return stored ? (JSON.parse(stored) as IFPendingMemoSync[]) : [];
};

const savePendingMemoSyncs = async (pending: IFPendingMemoSync[]) => {
	await AsyncStorage.setItem(PENDING_MEMO_SYNCS_KEY, JSON.stringify(pending));
};

/** 명시적으로 저장한 로컬 초안을 동기화 대기 목록에서 제거한다. */
export const resolvePendingMemoSync = async (localId: string) => {
	await markAsSynced([localId]);
	await clearSyncedMemos();
	const pending = await getPendingMemoSyncs();
	await savePendingMemoSyncs(
		pending.filter((item) => item.localId !== localId),
	);
};

/** 충돌한 초안을 삭제하지 않고 사용자 선택 전까지 동기화 대상에서 보존한다. */
export async function syncMemosToSupabase(): Promise<{
	synced: number;
	failed: number;
}> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) {
		return { synced: 0, failed: 0 };
	}

	const unsynced = await getUnsyncedMemos();
	if (unsynced.length === 0) {
		return { synced: 0, failed: 0 };
	}

	const groupCounts = new Map<string, number>();
	for (const memo of unsynced) {
		const pageKey = getPageKey(memo.url);
		groupCounts.set(pageKey, (groupCounts.get(pageKey) ?? 0) + 1);
	}

	const pending = await getPendingMemoSyncs();
	const syncedIds: string[] = [];
	let failed = 0;

	for (const memo of unsynced) {
		let reason: IFPendingMemoSync["reason"] | undefined;
		try {
			if ((groupCounts.get(getPageKey(memo.url)) ?? 0) > 1) {
				reason = "multiple-local";
			} else {
				const remote = await memoService.getMemoByUrl(memo.url);
				if (remote.error) {
					throw remote.error;
				}
				if ((remote.data?.length ?? 0) > 0) {
					reason = "remote-candidate";
				} else {
					const result = await memoService.insertMemo({
						url: memo.url,
						title: memo.title,
						memo: memo.memo,
						impression: memo.impression ?? null,
						actionItem: memo.actionItem ?? null,
						favIconUrl: memo.favIconUrl ?? null,
						isWish: memo.isWish ?? false,
						isStar: memo.isStar ?? false,
						isReading: memo.isReading ?? false,
					});
					if (result.error) {
						throw result.error;
					}
					if (!result.data?.[0]) {
						throw new Error("동기화 저장 결과를 확인하지 못했습니다.");
					}
					syncedIds.push(memo.id);
				}
			}
		} catch {
			reason = "save-error";
		}

		if (reason) {
			failed++;
			const item: IFPendingMemoSync = {
				localId: memo.id,
				url: memo.url,
				operation: "sync",
				reason,
			};
			const index = pending.findIndex(
				(candidate) => candidate.localId === memo.id,
			);
			if (index >= 0) {
				pending[index] = item;
			} else {
				pending.push(item);
			}
		}
	}

	if (syncedIds.length > 0) {
		await markAsSynced(syncedIds);
		await clearSyncedMemos();
	}
	await savePendingMemoSyncs(
		pending.filter((item) => !syncedIds.includes(item.localId)),
	);

	return { synced: syncedIds.length, failed };
}
