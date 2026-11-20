import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	getLocalStorageUsageRatio,
	LocalMemoService,
} from "@web-memo/shared/utils";
import { useCallback, useRef, useState } from "react";
import { reportSidePanelError } from "../../utils";
import {
	readDismissedGuestBanners,
	readShownGuestBanners,
	writeDismissedGuestBanners,
	writeShownGuestBanners,
} from "./guestBannerStorage";
import {
	nextOneTimeBanner,
	selectGuestBanner,
	type TGuestBannerVariant,
	type TOneTimeGuestBannerVariant,
} from "./selectGuestBanner";

const statsQueryOptions = () => ({
	queryKey: QUERY_KEY.guestBannerStats(),
	queryFn: async () => ({
		memoCount: await new LocalMemoService().countMemos(),
		usageRatio: await getLocalStorageUsageRatio(),
	}),
});

const dismissedQueryOptions = () => ({
	queryKey: QUERY_KEY.guestBannerDismissed(),
	queryFn: readDismissedGuestBanners,
});

const shownQueryOptions = () => ({
	queryKey: QUERY_KEY.guestBannerShown(),
	queryFn: readShownGuestBanners,
});

/**
 * 비로그인 권유 배너의 노출을 관리한다.
 * @description 저장 공간 배너(95% 차단·80% 경고)는 상태를 따라 보이고, 첫 저장·개수 배너는
 * 저장 직후(`notifySaved`) 노출 기록이 없을 때 한 번만 뜬다. 노출은 storage에 기록해 다른 세션에서 다시 뜨지 않는다.
 */
export default function useGuestLoginBanner({ isGuest }: { isGuest: boolean }) {
	const queryClient = useQueryClient();
	const [current, setCurrent] = useState<TOneTimeGuestBannerVariant | null>(
		null,
	);
	const currentRef = useRef(current);
	const { data: stats } = useQuery({
		...statsQueryOptions(),
		enabled: isGuest,
	});
	const { data: dismissed } = useQuery({
		...dismissedQueryOptions(),
		enabled: isGuest,
	});

	const variant =
		isGuest && stats && dismissed
			? selectGuestBanner({
					usageRatio: stats.usageRatio,
					dismissed,
					current,
				})
			: null;

	const showOneTime = useCallback((next: TOneTimeGuestBannerVariant | null) => {
		currentRef.current = next;
		setCurrent(next);
	}, []);

	const notifySaved = useCallback(async () => {
		if (!isGuest) return;
		try {
			const freshStats = await queryClient.fetchQuery({
				...statsQueryOptions(),
				staleTime: 0,
			});
			const [dismissedList, shown] = await Promise.all([
				queryClient.ensureQueryData(dismissedQueryOptions()),
				queryClient.ensureQueryData(shownQueryOptions()),
			]);
			const next = nextOneTimeBanner({
				memoCount: freshStats.memoCount,
				dismissed: dismissedList,
				shown,
				current: currentRef.current,
			});
			showOneTime(next);
			if (next && !shown.includes(next)) {
				// 첫 저장은 어떤 배너로든 이미 지나갔으므로 함께 기록해 다음 저장에 다시 뜨지 않게 한다.
				const nextShown = [...new Set([...shown, next, "firstSave" as const])];
				queryClient.setQueryData(QUERY_KEY.guestBannerShown(), nextShown);
				await writeShownGuestBanners(nextShown);
			}
		} catch (error) {
			reportSidePanelError({
				error,
				feature: "guest_login_banner",
				operation: "notify_saved",
				stage: "select",
				level: "warning",
			});
		}
	}, [isGuest, queryClient, showOneTime]);

	const dismiss = async (target: TGuestBannerVariant) => {
		if (currentRef.current === target) showOneTime(null);
		const next = [...(dismissed ?? []), target];
		queryClient.setQueryData(QUERY_KEY.guestBannerDismissed(), next);
		await writeDismissedGuestBanners(next);
	};

	return {
		variant,
		memoCount: stats?.memoCount ?? 0,
		/** 저장 공간이 가득 차 새 메모를 저장할 수 없는지 */
		isStorageBlocked: variant === "storageBlocked",
		notifySaved,
		dismiss,
	};
}
