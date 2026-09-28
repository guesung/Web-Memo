import type { MemoRow } from "@web-memo/shared/types";
import type { MemoService } from "@web-memo/shared/utils/services";
import { getPageKey } from "@web-memo/shared/utils/url";
import { trackAppEvent } from "@/lib/analytics/appAnalytics";
import { appendMemoText } from "@/lib/sharing/memoAppend";
import { extractPageMetadata } from "@/lib/sharing/pageMetadata";
import {
	type IFPendingSharedUrl,
	preserveSharedUrl,
	resolvePendingSharedUrl,
} from "@/lib/sharing/pendingSharedUrls";
import {
	getMemoByUrl,
	getUnsyncedMemos,
	type LocalMemo,
	toggleWishByUrl,
	upsertMemo,
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

/**
 * 공유 화면이 방금 저장한 위시 대상.
 * @description remote(Supabase)와 local(AsyncStorage)은 이어서 메모를 남길 때 쓰는
 * 저장 방식이 다르므로, 어느 쪽에 썼는지를 함께 들고 다닌다.
 */
export type TSharedWishTarget =
	| { kind: "remote"; memo: MemoRow }
	| { kind: "local"; memo: LocalMemo };

/**
 * Android 공유 화면 전용 위시 저장. 로그인 여부와 무관하게 바로 저장을 시도한다.
 * @description Android는 본 앱과 같은 프로세스라 AsyncStorage(로컬 메모)에 접근할 수
 * 있다. 로그인 세션이 있으면 `saveWishForSession`과 같은 기준(원격 + 로컬 미동기화
 * 후보)으로 판단하고, 없으면 로컬 저장소만으로 판단한다. 후보가 둘 이상이면 저장하지
 * 않고 본 앱에서 고르게 한다.
 */
export async function saveWishForAndroidShareScreen({
	url,
	title,
	favIconUrl,
}: {
	url: string;
	title: string;
	favIconUrl: string | null;
}): Promise<
	| { status: "saved"; target: TSharedWishTarget }
	| { status: "multiple-candidates" }
> {
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
			return { status: "multiple-candidates" };
		}
		return { status: "saved", target: { kind: "remote", memo: result.memo } };
	}

	const localCandidates = await getMemoByUrl(url);
	if (localCandidates.length > 1) {
		return { status: "multiple-candidates" };
	}
	const memo = localCandidates[0]?.isWish
		? localCandidates[0]
		: await toggleWishByUrl(url, title, favIconUrl ?? undefined);

	return { status: "saved", target: { kind: "local", memo } };
}

/** 공유 화면에서 저장한 위시 대상에 메모를 이어 붙인다. remote/local을 함께 다룬다. */
export async function appendSharedMemoText(
	target: TSharedWishTarget,
	text: string,
): Promise<void> {
	if (target.kind === "remote") {
		const result = await memoService.updateMemo({
			id: target.memo.id,
			request: { memo: appendMemoText(target.memo.memo, text) },
		});
		if (result.error) {
			throw result.error;
		}
		return;
	}

	await upsertMemo({
		selectedId: target.memo.id,
		url: target.memo.url,
		title: target.memo.title,
		memo: appendMemoText(target.memo.memo, text),
		favIconUrl: target.memo.favIconUrl,
		isWish: target.memo.isWish,
	});
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
	void trackAppEvent({
		name: "memo_status_toggle",
		params: { status: "wish", enabled: true, source: "share_intent" },
	});

	return { saved: true, title };
}
