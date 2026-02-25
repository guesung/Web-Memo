import { supabase, memoService } from "@/lib/supabase/client";
import { getUnsyncedMemos, markAsSynced } from "./localMemo";

export async function syncMemosToSupabase(): Promise<{
  synced: number;
  failed: number;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { synced: 0, failed: 0 };

  const unsynced = await getUnsyncedMemos();
  if (unsynced.length === 0) return { synced: 0, failed: 0 };

  const syncedIds: string[] = [];
  let failed = 0;

  for (const memo of unsynced) {
    try {
      const existing = await memoService.getMemoByUrl(memo.url);

      if (existing.data && existing.data.length > 0) {
        await memoService.updateMemo({
          id: existing.data[0].id,
          request: {
            url: memo.url,
            title: memo.title,
            memo: memo.memo,
            favIconUrl: memo.favIconUrl ?? null,
          },
        });
      } else {
        await memoService.insertMemo({
          url: memo.url,
          title: memo.title,
          memo: memo.memo,
          favIconUrl: memo.favIconUrl ?? null,
        });
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
}
