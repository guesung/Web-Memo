import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { extractPageMetadata } from "@/lib/sharing/pageMetadata";
import {
	addSharedExtensionPendingUrl,
	preserveSharedUrl,
} from "@/lib/sharing/pendingSharedUrls";
import {
	saveWishForAndroidShareScreen,
	saveWishForSession,
	type TSharedWishTarget,
} from "@/lib/sharing/shareHandler";
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
	target: TSharedWishTarget | null;
	onRetryButtonClick: () => void;
}

/**
 * 공유 시트가 열리자마자 위시 저장을 시도한다.
 * @description iOS는 로그인 세션 기준으로만 저장한다 — 로컬(AsyncStorage) 메모는 별도
 * 프로세스인 공유 확장에서 접근할 수 없어, 세션이 없으면 아예 시도하지 않고
 * "not-logged-in"으로 안내한다. Android는 본 앱과 같은 프로세스라 로그인 여부와
 * 무관하게 바로 저장한다(`saveWishForAndroidShareScreen`). 두 경우 모두 후보가
 * 둘 이상이거나 오류가 나면 요청을 보존해 본 앱이 나중에 이어받게 한다.
 */
export function useShareExtensionSave(
	sharedUrl: string,
	sharedTitle?: string,
): IFShareExtensionSaveState {
	const [status, setStatus] = useState<TShareExtensionStatus>("loading");
	const [title, setTitle] = useState(sharedTitle ?? sharedUrl);
	const [favIconUrl, setFavIconUrl] = useState<string | null>(null);
	const [target, setTarget] = useState<TSharedWishTarget | null>(null);
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

			if (Platform.OS === "android") {
				try {
					const result = await saveWishForAndroidShareScreen({
						url: sharedUrl,
						title: meta.title,
						favIconUrl: meta.favIconUrl,
					});
					if (isCancelled) {
						return;
					}
					if (result.status === "multiple-candidates") {
						await preserveSharedUrl({
							url: sharedUrl,
							title: meta.title,
							favIconUrl: meta.favIconUrl,
							createdAt: new Date().toISOString(),
						});
						setStatus("multiple-candidates");
						return;
					}
					setTarget(result.target);
					setStatus("saved");
				} catch {
					if (isCancelled) {
						return;
					}
					await preserveSharedUrl({
						url: sharedUrl,
						title: meta.title,
						favIconUrl: meta.favIconUrl,
						createdAt: new Date().toISOString(),
					});
					setStatus("error");
				}
				return;
			}

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
				setTarget({ kind: "remote", memo: result.memo });
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
		target,
		onRetryButtonClick: handleRetryButtonClick,
	};
}
