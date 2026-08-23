import type { HighlightColor } from "@web-memo/shared/constants";
import { groupHighlightsByUrl } from "@web-memo/shared/modules/highlight";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useHighlightCounts } from "@/lib/hooks/useHighlightCounts";
import { useHighlightList } from "@/lib/hooks/useHighlightList";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * 하이라이트 모아보기 화면의 상태를 묶는다.
 * @description 검색 입력은 디바운스한 뒤 쿼리에 넘기고, 목록은 URL별로 묶어 돌려준다.
 */
export function useHighlightScreen() {
	const { isLoggedIn } = useAuth();
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedColor, setSelectedColor] = useState<HighlightColor>();

	useEffect(() => {
		const timer = setTimeout(
			() => setSearchQuery(searchInput.trim()),
			SEARCH_DEBOUNCE_MS,
		);

		return () => clearTimeout(timer);
	}, [searchInput]);

	const {
		data,
		isLoading,
		refetch,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useHighlightList({
		searchQuery: searchQuery || undefined,
		color: selectedColor,
	});

	const groups = groupHighlightsByUrl(data?.pages.flat() ?? []);
	const highlightCounts = useHighlightCounts(groups.map((group) => group.url));
	const isFiltering = searchQuery.length > 0 || selectedColor !== undefined;

	const handleEndReached = () => {
		if (isLoggedIn && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	};

	return {
		isLoggedIn,
		searchInput,
		setSearchInput,
		selectedColor,
		setSelectedColor,
		groups,
		highlightCounts,
		isFiltering,
		isLoading,
		refetch,
		isFetchingNextPage,
		handleEndReached,
	};
}
