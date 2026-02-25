import { supabase } from "@/lib/supabase/client";
import { toggleWishByUrl } from "@/lib/storage/localMemo";

function getFavIconUrl(pageUrl: string): string | null {
	try {
		const origin = new URL(pageUrl).origin;
		return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`;
	} catch {
		return null;
	}
}

async function fetchPageTitle(url: string): Promise<string | null> {
	try {
		const response = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0" },
		});
		const html = await response.text().then((t) => t.slice(0, 50000));
		const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		return match?.[1]?.trim() || null;
	} catch {
		return null;
	}
}

export async function handleSharedUrl(
	url: string,
	metaTitle?: string,
): Promise<{ saved: boolean; title: string }> {
	let title = metaTitle || "";
	if (!title) {
		title = (await fetchPageTitle(url)) || "";
	}
	if (!title) {
		try {
			title = new URL(url).hostname.replace("www.", "");
		} catch {
			title = url;
		}
	}

	const favIconUrl = getFavIconUrl(url);
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
