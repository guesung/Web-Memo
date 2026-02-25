import { supabase } from "@/lib/supabase/client";
import { toggleWishByUrl } from "@/lib/storage/localMemo";

export async function handleSharedUrl(url: string): Promise<{ saved: boolean; title: string }> {
  let title = "";
  try {
    const parsed = new URL(url);
    title = parsed.hostname.replace("www.", "");
  } catch {
    title = url;
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    const { MemoService } = await import("@web-memo/shared/utils/services");
    const memoService = new MemoService(supabase);

    const existing = await memoService.getMemoByUrl(url);
    if (existing.data && existing.data.length > 0) {
      if (!existing.data[0].isWish) {
        await memoService.updateMemo({
          id: existing.data[0].id,
          request: { url, title: existing.data[0].title, memo: existing.data[0].memo ?? "", favIconUrl: existing.data[0].favIconUrl ?? null, isWish: true },
        });
      }
    } else {
      await memoService.insertMemo({ url, title, memo: "", favIconUrl: null, isWish: true });
    }
  } else {
    await toggleWishByUrl(url, title);
  }

  return { saved: true, title };
}
