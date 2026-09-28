import type { MemoRow } from "@web-memo/shared/types";
import type { MemoService } from "@web-memo/shared/utils/services";
import { getPageKey } from "@web-memo/shared/utils/url";
import { extractPageMetadata } from "@/lib/sharing/pageMetadata";
import {
	type IFPendingSharedUrl,
	preserveSharedUrl,
	resolvePendingSharedUrl,
} from "@/lib/sharing/pendingSharedUrls";
import {
	getMemoByUrl,
	getUnsyncedMemos,
	toggleWishByUrl,
} from "@/lib/storage/localMemo";
import { memoService, supabase } from "@/lib/supabase/client";

/** 로그인 세션 위시 저장 결과. 후보가 둘 이상이면 저장하지 않고 선택을 요구한다. */
export type TSaveWishForSessionResult =
	| { status: "saved"; memo: MemoRow }
	| { status: "multiple-candidates" };

/**
 * 로그인 세션에서 원격 메모 후보를 기준으로 위시 저장을 시도한다.
 * @description 본 앱과 iOS 공유 확장이 함께 쓴다. 확장은 본 앱 로컬(AsyncStorage) 메모에
 * 접근할 수 없어 `localCandidateCount`를 넘기지 않고(기본값 0) 원격 후보만으로 판단한다.
 * 원격 후보가 둘 이상이거나 로컬 미동기화 후보가 있으면 저장하지 않고 후보 선택을 요구한다.
 */
export async function saveWishForSession({
	memoService: service,
	url,
	title,
	favIconUrl,
	localCandidateCount = 0,
}: {
	memoService: MemoService;
	url: string;
	title: string;
	favIconUrl: string | null;
	localCandidateCount?: number;
}): Promise<TSaveWishForSessionResult> {
	const remote = await service.getMemoByUrl(url);
	if (remote.error) {
		throw remote.error;
	}
	const remoteCount = remote.data?.length ?? 0;
	if (localCandidateCount > 0 || remoteCount > 1) {
		return { status: "multiple-candidates" };
	}

	const existing = remote.data?.[0];
	const result = existing
		? await service.updateMemo({
				id: existing.id,
				request: { isWish: true },
			})
		: await service.insertMemo({
				url,
				title,
				memo: "",
				favIconUrl,
				isWish: true,
			});
	if (result.error) {
		throw result.error;
	}
	const saved = result.data?.[0];
	if (!saved || (existing && saved.id !== existing.id)) {
		throw new Error("공유 메모 저장 결과를 확인하지 못했습니다.");
	}

	return { status: "saved", memo: saved };
}

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
			const localUnsynced = await getUnsyncedMemos();
			const localCandidates = localUnsynced.filter(
				(memo) => getPageKey(memo.url) === getPageKey(url),
			);
			const result = await saveWishForSession({
				memoService,
				url,
				title,
				favIconUrl,
				localCandidateCount: localCandidates.length,
			});
			if (result.status === "multiple-candidates") {
				await preserveSharedUrl(pending);
				return { saved: false, title };
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
