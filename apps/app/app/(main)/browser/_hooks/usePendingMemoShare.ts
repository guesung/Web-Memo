import { getPageKey } from "@web-memo/shared/utils/url";
import { useEffect, useState } from "react";
import { useLocalMemoWishToggle } from "@/lib/hooks/useLocalMemos";
import { useMemoWishToggleMutation } from "@/lib/hooks/useMemoMutation";
import type { TMemoCandidate } from "@/lib/memoCandidates";
import {
	getPendingSharedUrls,
	resolvePendingSharedUrl,
} from "@/lib/sharing/shareHandler";

/** 현재 페이지의 보류 공유 요청을 선택된 메모에 적용한다. */
export const usePendingMemoShare = ({
	url,
	pageKey,
	pageTitle,
	favIconUrl,
	isLoggedIn,
	selectedMemo,
}: {
	url: string;
	pageKey: string;
	pageTitle: string;
	favIconUrl?: string;
	isLoggedIn: boolean;
	selectedMemo?: TMemoCandidate;
}) => {
	const [hasPendingShare, setHasPendingShare] = useState(false);
	const wishToggle = useMemoWishToggleMutation();
	const localWishToggle = useLocalMemoWishToggle();

	useEffect(() => {
		getPendingSharedUrls().then((pending) => {
			setHasPendingShare(
				pending.some((item) => getPageKey(item.url) === pageKey),
			);
		});
	}, [pageKey]);

	const handlePendingShareApply = () => {
		if (selectedMemo?.isWish) {
			resolvePendingSharedUrl(url).then(() => setHasPendingShare(false));
			return;
		}
		const onSuccess = async () => {
			await resolvePendingSharedUrl(url);
			setHasPendingShare(false);
		};
		if (!isLoggedIn || typeof selectedMemo?.id === "string") {
			localWishToggle.mutate(
				{
					url,
					title: pageTitle || url,
					favIconUrl,
					selectedId:
						typeof selectedMemo?.id === "string" ? selectedMemo.id : undefined,
				},
				{ onSuccess },
			);
			return;
		}
		wishToggle.mutate(
			{
				url,
				title: pageTitle || url,
				favIconUrl,
				selectedId:
					typeof selectedMemo?.id === "number" ? selectedMemo.id : undefined,
				currentIsWish: false,
			},
			{ onSuccess },
		);
	};

	return {
		hasPendingShare,
		handlePendingShareApply,
		isPendingShareApply: wishToggle.isPending || localWishToggle.isPending,
	};
};
