import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPageKey } from "@web-memo/shared/utils/url";
import { extractPageMetadata } from "@/lib/sharing/pageMetadata";
import {
	getMemoByUrl,
	getUnsyncedMemos,
	toggleWishByUrl,
} from "@/lib/storage/localMemo";
import { supabase } from "@/lib/supabase/client";

const PENDING_SHARED_URLS_KEY = "webmemo:pendingSharedUrls";

/** 대상 메모 선택 전까지 유지할 공유 요청. */
export interface IFPendingSharedUrl {
	url: string;
	title: string;
	favIconUrl: string | null;
	createdAt: string;
}

/** 보류한 공유 요청을 읽는다. */
export const getPendingSharedUrls = async (): Promise<IFPendingSharedUrl[]> => {
	const stored = await AsyncStorage.getItem(PENDING_SHARED_URLS_KEY);
	return stored ? (JSON.parse(stored) as IFPendingSharedUrl[]) : [];
};

const preserveSharedUrl = async (pending: IFPendingSharedUrl) => {
	const stored = await getPendingSharedUrls();
	await AsyncStorage.setItem(
		PENDING_SHARED_URLS_KEY,
		JSON.stringify([
			...stored.filter((item) => item.url !== pending.url),
			pending,
		]),
	);
};

/** 사용자가 위시 대상 메모를 지정한 공유 요청을 보류 목록에서 제거한다. */
export const resolvePendingSharedUrl = async (url: string) => {
	const stored = await getPendingSharedUrls();
	await AsyncStorage.setItem(
		PENDING_SHARED_URLS_KEY,
		JSON.stringify(
			stored.filter((item) => getPageKey(item.url) !== getPageKey(url)),
		),
	);
};

/** 공유한 URL을 위시리스트에 추가하거나, 후보 충돌이면 요청을 보존한다. */
export async function handleSharedUrl(
	url: string,
	metaTitle?: string,
): Promise<{ saved: boolean; title: string }> {
	const { title, favIconUrl } = await extractPageMetadata(url, metaTitle);
	const pending: IFPendingSharedUrl = {
		url,
		title,
		favIconUrl: favIconUrl ?? null,
		createdAt: new Date().toISOString(),
	};
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (session) {
			const { MemoService } = await import("@web-memo/shared/utils/services");
			const memoService = new MemoService(supabase);
			const [remote, localUnsynced] = await Promise.all([
				memoService.getMemoByUrl(url),
				getUnsyncedMemos(),
			]);
			if (remote.error) {
				throw remote.error;
			}
			const localCandidates = localUnsynced.filter(
				(memo) => getPageKey(memo.url) === getPageKey(url),
			);
			if ((remote.data?.length ?? 0) + localCandidates.length > 1) {
				await preserveSharedUrl(pending);
				return { saved: false, title };
			}
			if (localCandidates.length > 0) {
				await preserveSharedUrl(pending);
				return { saved: false, title };
			}
			const existing = remote.data?.[0];
			const result = existing
				? await memoService.updateMemo({
						id: existing.id,
						request: { isWish: true },
					})
				: await memoService.insertMemo({
						url,
						title,
						memo: "",
						favIconUrl,
						isWish: true,
					});
			if (result.error) {
				throw result.error;
			}
			if (
				!result.data?.[0] ||
				(existing && result.data[0].id !== existing.id)
			) {
				throw new Error("공유 메모 저장 결과를 확인하지 못했습니다.");
			}
		} else {
			const localCandidates = await getMemoByUrl(url);
			if (localCandidates.length > 1) {
				await preserveSharedUrl(pending);
				return { saved: false, title };
			}
			if (!localCandidates[0]?.isWish) {
				await toggleWishByUrl(url, title, favIconUrl ?? undefined);
			}
		}
	} catch {
		await preserveSharedUrl(pending);
		return { saved: false, title };
	}

	await resolvePendingSharedUrl(url);

	return { saved: true, title };
}
