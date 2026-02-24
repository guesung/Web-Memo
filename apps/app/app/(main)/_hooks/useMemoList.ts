import { useAuth } from "@/lib/auth/AuthProvider";
import {
	useLocalMemos,
	useLocalMemoWishToggle,
} from "@/lib/hooks/useLocalMemos";
import { useMemoWishToggleMutation } from "@/lib/hooks/useMemoMutation";
import { useMemosInfinite } from "@/lib/hooks/useMemos";
import { useState } from "react";
import type { MemoItem } from "../_components/MemoCard";

export function useMemoList() {
	const { isLoggedIn } = useAuth();
	const [filter, setFilter] = useState<"all" | "wish">("all");

	const wishToggleLocal = useLocalMemoWishToggle();
	const wishToggleSupabase = useMemoWishToggleMutation();

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
	} = useMemosInfinite(isLoggedIn ? { isWish: filter === "wish" } : undefined);

	const memos: MemoItem[] = isLoggedIn
		? (supabaseMemosData?.pages.flatMap((p) => p.data) ?? [])
		: (localMemosData ?? []).filter((m) =>
				filter === "wish" ? m.isWish : !m.isWish,
			);
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
	};
}
