import { extractPageMetadata } from "@/lib/sharing/pageMetadata";
import { toggleWishByUrl } from "@/lib/storage/localMemo";
import { supabase } from "@/lib/supabase/client";

export async function handleSharedUrl(
	url: string,
	metaTitle?: string,
): Promise<{ saved: boolean; title: string }> {
	const { title, favIconUrl } = await extractPageMetadata(url, metaTitle);

	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (session) {
		const { MemoService } = await import("@web-memo/shared/utils/services");
		const memoService = new MemoService(supabase);

		const existing = await memoService.getMemoByUrl(url);
		if (existing.data && existing.data.length > 0) {
			if (!existing.data[0].isWish) {
				await memoService.updateMemo({
					id: existing.data[0].id,
					request: {
						url,
						title: existing.data[0].title,
						memo: existing.data[0].memo ?? "",
						favIconUrl: existing.data[0].favIconUrl ?? favIconUrl,
						isWish: true,
					},
				});
			}
		} else {
			await memoService.insertMemo({
				url,
				title,
				memo: "",
				favIconUrl,
				isWish: true,
			});
		}
	} else {
		await toggleWishByUrl(url, title, favIconUrl ?? undefined);
	}

	return { saved: true, title };
}
