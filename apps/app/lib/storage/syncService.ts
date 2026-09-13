import { MemoService } from "@web-memo/shared/utils/services";
import { supabase } from "@/lib/supabase/client";
import { getUnsyncedMemos, markAsSynced } from "./localMemo";

const memoService = new MemoService(supabase);

/** 서버 저장을 확인한 항목만 동기화로 표시하고 로컬 사본을 삭제하지 않습니다. */
export const syncMemosToSupabase = async (): Promise<{
	synced: number;
	failed: number;
}> => {
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

	const syncedIds: string[] = [];
	let failed = 0;

	for (const memo of unsynced) {
		try {
			const existing = await memoService.getMemoByUrl(memo.url);
			if (existing.error) {
				throw existing.error;
			}

			if (existing.data && existing.data.length > 0) {
				const result = await memoService.updateMemo({
					id: existing.data[0].id,
					request: {
						url: memo.url,
						title: memo.title,
						memo: memo.memo,
						impression: memo.impression ?? null,
						actionItem: memo.actionItem ?? null,
						favIconUrl: memo.favIconUrl ?? null,
						isWish: memo.isWish ?? existing.data[0].isWish,
					},
				});
				if (result.error || !result.data?.length) {
					throw result.error ?? new Error("MEMO_SYNC_NOT_CONFIRMED");
				}
			} else {
				const result = await memoService.insertMemo({
					url: memo.url,
					title: memo.title,
					memo: memo.memo,
					impression: memo.impression ?? null,
					actionItem: memo.actionItem ?? null,
					favIconUrl: memo.favIconUrl ?? null,
					isWish: memo.isWish ?? false,
				});
				if (result.error || !result.data?.length) {
					throw result.error ?? new Error("MEMO_SYNC_NOT_CONFIRMED");
				}
			}

			syncedIds.push(memo.id);
		} catch {
			failed++;
		}
	}

	if (syncedIds.length > 0) {
		await markAsSynced(syncedIds);
	}

	return { synced: syncedIds.length, failed };
};
