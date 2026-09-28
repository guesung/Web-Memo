import type { MemoRow } from "@web-memo/shared/types";
import { useEffect, useState } from "react";
import { extractPageMetadata } from "@/lib/sharing/pageMetadata";
import { addSharedExtensionPendingUrl } from "@/lib/sharing/pendingSharedUrls";
import { saveWishForSession } from "@/lib/sharing/shareHandler";
import { memoService, supabase } from "@/lib/supabase/client";

/** 공유 시트가 보여줄 수 있는 상태. */
export type TShareExtensionStatus =
	| "loading"
	| "saved"
	| "multiple-candidates"
	| "error"
	| "not-logged-in";

/** useShareExtensionSave가 반환하는 값. */
export interface IFShareExtensionSaveState {
	status: TShareExtensionStatus;
	title: string;
	favIconUrl: string | null;
	memo: MemoRow | null;
	onRetryButtonClick: () => void;
}

/**
 * 공유 시트가 열리자마자 로그인 세션 기준으로 위시 저장을 시도한다.
 * @description 원격 후보가 둘 이상이거나 오류가 나면 App Group 키체인에 공유 요청을
 * 보존해 본 앱이 나중에 이어받게 한다. 로그인 세션이 없으면 아예 시도하지 않는다 —
 * 로컬(AsyncStorage) 메모는 본 앱 전용이라 확장에서 접근할 수 없기 때문이다.
 */
export function useShareExtensionSave(
	sharedUrl: string,
	sharedTitle?: string,
): IFShareExtensionSaveState {
	const [status, setStatus] = useState<TShareExtensionStatus>("loading");
	const [title, setTitle] = useState(sharedTitle ?? sharedUrl);
	const [favIconUrl, setFavIconUrl] = useState<string | null>(null);
	const [memo, setMemo] = useState<MemoRow | null>(null);
	const [attempt, setAttempt] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt는 재시도 트리거로만 쓰는 nonce다.
	useEffect(() => {
		if (!sharedUrl) {
			return;
		}

		let isCancelled = false;

		async function run() {
			setStatus("loading");

			const meta = await extractPageMetadata(sharedUrl, sharedTitle);
			if (isCancelled) {
				return;
			}
			setTitle(meta.title);
			setFavIconUrl(meta.favIconUrl);

			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (isCancelled) {
				return;
			}
			if (!session) {
				setStatus("not-logged-in");
				return;
			}

			try {
				const result = await saveWishForSession({
					memoService,
					url: sharedUrl,
					title: meta.title,
					favIconUrl: meta.favIconUrl,
				});
				if (isCancelled) {
					return;
				}
				if (result.status === "multiple-candidates") {
					await addSharedExtensionPendingUrl({
						url: sharedUrl,
						title: meta.title,
						favIconUrl: meta.favIconUrl,
						createdAt: new Date().toISOString(),
					});
					setStatus("multiple-candidates");
					return;
				}
				setMemo(result.memo);
				setStatus("saved");
			} catch {
				if (isCancelled) {
					return;
				}
				await addSharedExtensionPendingUrl({
					url: sharedUrl,
					title: meta.title,
					favIconUrl: meta.favIconUrl,
					createdAt: new Date().toISOString(),
				});
				setStatus("error");
			}
		}

		run();

		return () => {
			isCancelled = true;
		};
	}, [sharedUrl, sharedTitle, attempt]);

	const handleRetryButtonClick = () => {
		setAttempt((value) => value + 1);
	};

	return {
		status,
		title,
		favIconUrl,
		memo,
		onRetryButtonClick: handleRetryButtonClick,
	};
}
