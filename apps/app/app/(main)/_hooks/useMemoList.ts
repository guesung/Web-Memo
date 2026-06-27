import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
	useLocalMemoStarToggle,
	useLocalMemos,
	useLocalMemoUpsert,
	useLocalMemoWishToggle,
} from "@/lib/hooks/useLocalMemos";
import {
	useMemoStarToggleMutation,
	useMemoUpsertMutation,
	useMemoWishToggleMutation,
} from "@/lib/hooks/useMemoMutation";
import { useMemosInfinite } from "@/lib/hooks/useMemos";
import type { MemoItem } from "../_components/MemoCard";

type MemoFilter = "all" | "wish" | "star";

export function useMemoList() {
	const { isLoggedIn } = useAuth();
	const [filter, setFilter] = useState<MemoFilter>("all");

	const wishToggleLocal = useLocalMemoWishToggle();
	const wishToggleSupabase = useMemoWishToggleMutation();
	const starToggleLocal = useLocalMemoStarToggle();
	const starToggleSupabase = useMemoStarToggleMutation();
	const upsertLocal = useLocalMemoUpsert();
	const upsertSupabase = useMemoUpsertMutation();

	const {
		data: localMemosData,
		isLoading: isLocalLoading,
		refetch: refetchLocal,
	} = useLocalMemos();
	const {
		data: supabaseMemosData,
		isLoading: isSupabaseLoading,
		refetch: refetchSupabase,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useMemosInfinite(
		isLoggedIn
			? filter === "wish"
				? { isWish: true }
				: filter === "star"
					? { isStar: true }
					: { isWish: false }
			: undefined,
	);

	const memos: MemoItem[] = isLoggedIn
		? (supabaseMemosData?.pages.flatMap((p) => p.data) ?? [])
		: (localMemosData ?? []).filter((m) => {
				if (filter === "wish") return m.isWish;
				if (filter === "star") return m.isStar;
				return !m.isWish;
			});
	const isLoading = isLoggedIn ? isSupabaseLoading : isLocalLoading;
	const refetch = isLoggedIn ? refetchSupabase : refetchLocal;

	const handleEndReached = () => {
		if (isLoggedIn && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	};

	const handleWishRemove = (memo: MemoItem) => {
		if (isLoggedIn) {
			const favIconUrl =
				"favIconUrl" in memo ? (memo.favIconUrl ?? undefined) : undefined;
			wishToggleSupabase.mutate({
				url: memo.url,
				title: memo.title,
				favIconUrl,
				currentIsWish: true,
			});
		} else {
			wishToggleLocal.mutate({ url: memo.url });
		}
	};

	const handleStarToggle = (memo: MemoItem) => {
		const currentIsStar = "isStar" in memo ? Boolean(memo.isStar) : false;
		if (isLoggedIn) {
			const favIconUrl =
				"favIconUrl" in memo ? (memo.favIconUrl ?? undefined) : undefined;
			starToggleSupabase.mutate({
				url: memo.url,
				title: memo.title,
				favIconUrl,
				currentIsStar,
			});
		} else {
			starToggleLocal.mutate({ url: memo.url });
		}
	};

	const handleMemoSave = (
		memo: MemoItem,
		next: { memo: string; impression: string; actionItem: string },
	) => {
		const favIconUrl =
			"favIconUrl" in memo ? (memo.favIconUrl ?? undefined) : undefined;
		if (isLoggedIn) {
			upsertSupabase.mutate({
				url: memo.url,
				title: memo.title,
				memo: next.memo,
				impression: next.impression,
				actionItem: next.actionItem,
				favIconUrl,
			});
		} else {
			upsertLocal.mutate({
				url: memo.url,
				title: memo.title,
				memo: next.memo,
				impression: next.impression,
				actionItem: next.actionItem,
				favIconUrl,
			});
		}
	};

	return {
		isLoggedIn,
		filter,
		setFilter,
		memos,
		isLoading,
		refetch,
		isFetchingNextPage,
		handleEndReached,
		handleWishRemove,
		handleStarToggle,
		handleMemoSave,
	};
}
