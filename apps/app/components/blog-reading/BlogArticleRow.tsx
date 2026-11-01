import type { IFBlogArticleItem } from "@web-memo/shared/types/blog-reading";
import { Check, ExternalLink } from "lucide-react-native";
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { formatDate } from "@/app/(main)/_utils/formatDate";
import { getBlogDisplayName } from "./blogSourceStatusCopy";

interface BlogArticleRowProps {
	article: IFBlogArticleItem;
	onOpenArticle: (article: IFBlogArticleItem) => void;
	onWriteMemo: (article: IFBlogArticleItem) => void;
	onViewMemo: (article: IFBlogArticleItem) => void;
}

/**
 * 정주행 목록의 글 한 행.
 * @description 완료 표시는 메모 유무로 서버가 계산한 읽기 전용 값이라 눌러서 바꿀 수 없다.
 * 완료 글도 제목 대비를 낮추지 않는다. 사용처: app/blog-reading.tsx
 */
export function BlogArticleRow({
	article,
	onOpenArticle,
	onWriteMemo,
	onViewMemo,
}: BlogArticleRowProps) {
	const isDark = useColorScheme() === "dark";
	const meta = [
		getBlogDisplayName(article.blogId),
		article.publishedAt ? formatDate(article.publishedAt) : null,
	]
		.filter(Boolean)
		.join(" · ");
	const statusText = article.completed ? "메모 완료" : "메모 전";

	return (
		<View className="flex-row items-start gap-3 px-3 py-4 border-b border-border dark:border-neutral-800">
			<View
				className={`mt-0.5 w-5 h-5 rounded items-center justify-center border ${article.completed ? "bg-foreground border-foreground dark:bg-white dark:border-white" : "border-gray-300 dark:border-neutral-600"}`}
				accessibilityLabel={statusText}
			>
				{article.completed ? (
					<Check size={13} color={isDark ? "#111" : "#fff"} />
				) : null}
			</View>
			<View className="flex-1">
				<Text className="text-sm font-semibold text-foreground dark:text-white">
					{article.title}
				</Text>
				<Text className="text-xs text-muted-foreground dark:text-neutral-400 mt-1">
					{meta}
				</Text>
				<View className="flex-row items-center justify-between gap-2 mt-3">
					<Text className="text-xs text-muted-foreground dark:text-neutral-400">
						{statusText}
					</Text>
					<View className="flex-row gap-1">
						<TouchableOpacity
							className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border dark:border-neutral-700"
							onPress={() => onOpenArticle(article)}
							accessibilityRole="link"
							accessibilityLabel={`${article.title} 원문 열기`}
						>
							<Text className="text-xs text-foreground dark:text-white">
								원문
							</Text>
							<ExternalLink size={12} color={isDark ? "#fff" : "#111"} />
						</TouchableOpacity>
						<TouchableOpacity
							className="px-2.5 py-1.5 rounded-lg border border-border dark:border-neutral-700"
							onPress={() =>
								article.completed ? onViewMemo(article) : onWriteMemo(article)
							}
							accessibilityRole="button"
							accessibilityLabel={`${article.title} ${article.completed ? "메모 보기" : "메모하기"}`}
						>
							<Text className="text-xs text-foreground dark:text-white">
								{article.completed ? "메모 보기" : "메모하기"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</View>
	);
}
