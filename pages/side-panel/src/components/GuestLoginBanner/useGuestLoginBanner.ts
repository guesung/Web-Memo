import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	getLocalStorageUsageRatio,
	LocalMemoService,
} from "@web-memo/shared/utils";
import { useCallback, useState } from "react";
import {
	readDismissedGuestBanners,
	writeDismissedGuestBanners,
} from "./guestBannerStorage";
import {
	selectGuestBanner,
	type TGuestBannerVariant,
} from "./selectGuestBanner";

/**
 * 비로그인 권유 배너의 노출을 관리한다.
 * @description 기기 메모 개수·저장 공간 사용 비율·닫은 변형으로 배너 하나를 고른다(`selectGuestBanner`).
 * 메모가 저장될 때마다 `notifySaved`를 불러 개수와 사용 비율을 다시 읽는다.
 */
export default function useGuestLoginBanner({ isGuest }: { isGuest: boolean }) {
	const queryClient = useQueryClient();
	const [hasSavedInSession, setHasSavedInSession] = useState(false);
	const { data: stats } = useQuery({
		queryKey: QUERY_KEY.guestBannerStats(),
		queryFn: async () => ({
			memoCount: await new LocalMemoService().countMemos(),
			usageRatio: await getLocalStorageUsageRatio(),
		}),
		enabled: isGuest,
	});
	const { data: dismissed } = useQuery({
		queryKey: QUERY_KEY.guestBannerDismissed(),
		queryFn: readDismissedGuestBanners,
		enabled: isGuest,
	});

	const variant =
		isGuest && stats && dismissed
			? selectGuestBanner({ ...stats, dismissed, hasSavedInSession })
			: null;

	const notifySaved = useCallback(() => {
		setHasSavedInSession(true);
		void queryClient.invalidateQueries({
			queryKey: QUERY_KEY.guestBannerStats(),
		});
	}, [queryClient]);

	const dismiss = async (target: TGuestBannerVariant) => {
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
