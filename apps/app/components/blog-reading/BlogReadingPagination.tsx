import { BLOG_READING_PAGE_SIZE } from "@web-memo/shared/constants/blog-catalog";
import { Text, TouchableOpacity, View } from "react-native";

interface BlogReadingPaginationProps {
	/** 1부터 시작하는 현재 쪽 */
	pageIndex: number;
	/** 현재 쪽에 보이는 글 수 */
	visibleCount: number;
	/** 모든 구독 소스의 수집이 끝나 확정된 총 글 수. 수집 중이면 null */
	confirmedTotal: number | null;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onPrevious: () => void;
	onNext: () => void;
}

/**
 * 30개 단위 페이지 이동.
 * @description 전체 수집이 끝나기 전에는 총 쪽 수를 추정하지 않고 확보한 데이터 범위만 보여 준다.
 * 사용처: app/blog-reading.tsx
 */
export function BlogReadingPagination({
	pageIndex,
	visibleCount,
	confirmedTotal,
	hasNextPage,
	isFetchingNextPage,
	onPrevious,
	onNext,
}: BlogReadingPaginationProps) {
	const from = (pageIndex - 1) * BLOG_READING_PAGE_SIZE + 1;
	const to = from + visibleCount - 1;
	const totalPages =
		confirmedTotal === null
			? null
			: Math.max(1, Math.ceil(confirmedTotal / BLOG_READING_PAGE_SIZE));
	const rangeText =
		confirmedTotal === null
			? `${from}–${to}번째 글`
			: `${from}–${to} / ${confirmedTotal}개`;
	const pageText =
		totalPages === null ? `${pageIndex}쪽` : `${pageIndex} / ${totalPages}쪽`;

	return (
		<View className="px-5 mt-4">
			<View className="flex-row items-center justify-between gap-2">
				<Text className="text-xs text-muted-foreground dark:text-neutral-400">
					{rangeText}
				</Text>
				<View className="flex-row items-center gap-2">
					<TouchableOpacity
						className={`px-3 py-2 rounded-lg border border-border dark:border-neutral-700 ${pageIndex === 1 ? "opacity-45" : ""}`}
						onPress={onPrevious}
						disabled={pageIndex === 1}
						accessibilityRole="button"
						accessibilityLabel="이전 쪽"
					>
						<Text className="text-xs text-foreground dark:text-white">
							이전
						</Text>
					</TouchableOpacity>
					<Text className="text-xs text-foreground dark:text-white">
						{pageText}
					</Text>
					<TouchableOpacity
						className={`px-3 py-2 rounded-lg border border-border dark:border-neutral-700 ${hasNextPage && !isFetchingNextPage ? "" : "opacity-45"}`}
						onPress={onNext}
						disabled={!hasNextPage || isFetchingNextPage}
						accessibilityRole="button"
						accessibilityLabel="다음 쪽"
					>
						<Text className="text-xs text-foreground dark:text-white">
							다음
						</Text>
					</TouchableOpacity>
				</View>
			</View>
			{confirmedTotal === null && !hasNextPage ? (
				<Text className="text-xs text-muted-foreground dark:text-neutral-400 mt-3 p-3 rounded-lg bg-muted dark:bg-neutral-800">
					이전 글을 더 모으고 있어요. 확보한 마지막 페이지예요.
				</Text>
			) : null}
			<Text className="text-xs text-muted-foreground dark:text-neutral-400 mt-3">
				메모 · 느낀 점 · 실행할 일 중 하나를 저장하면 체크돼요.
			</Text>
		</View>
	);
}
