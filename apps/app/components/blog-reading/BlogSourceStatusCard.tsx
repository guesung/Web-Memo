import type { IFBlogReadingSummarySource } from "@web-memo/shared/types/blog-reading";
import { getBlogSourceViewState } from "@web-memo/shared/utils/blog-reading";
import { Text, TouchableOpacity, View } from "react-native";
import {
	getBlogDisplayName,
	getBlogSourceStatusCopy,
} from "./blogSourceStatusCopy";

interface BlogSourceStatusCardProps {
	sources: readonly IFBlogReadingSummarySource[];
	/** 수집 재개 요청을 보내는 중이면 버튼을 잠근다 */
	isResumePending: boolean;
	onResume: (blogId: IFBlogReadingSummarySource["blogId"]) => void;
}

/**
 * 구독한 블로그별 수집 상태 카드.
 * @description 부분 실패에는 '수집 재개' 버튼을 함께 보여 준다. 수집 중에는 분모·퍼센트를 보여 주지 않는다.
 * 사용처: app/blog-reading.tsx
 */
export function BlogSourceStatusCard({
	sources,
	isResumePending,
	onResume,
}: BlogSourceStatusCardProps) {
	return (
		<View
			className="mx-5 mb-4 px-4 py-1 rounded-xl border border-border dark:border-neutral-800 bg-card dark:bg-neutral-900"
			accessibilityLabel="블로그별 수집 상태"
		>
			{sources.map((source, index) => {
				const viewState = getBlogSourceViewState(source);
				const copy = getBlogSourceStatusCopy({
					blogName: getBlogDisplayName(source.blogId),
					viewState,
					collectedCount: source.collectedCount,
					total: source.total,
				});

				return (
					<View
						key={source.blogId}
						className={`flex-row items-center gap-3 py-3 ${index > 0 ? "border-t border-border dark:border-neutral-800" : ""}`}
					>
						<View className="flex-1">
							<Text className="text-sm font-semibold text-foreground dark:text-white">
								{copy.title}
							</Text>
							<Text className="text-xs text-muted-foreground dark:text-neutral-400 mt-1">
								{copy.description}
							</Text>
							{copy.hint ? (
								<Text className="text-xs text-muted-foreground dark:text-neutral-400 mt-1">
									{copy.hint}
								</Text>
							) : null}
						</View>
						{viewState === "partialFailed" ? (
							<TouchableOpacity
								className="px-3 py-2 rounded-lg border border-foreground dark:border-neutral-500"
								onPress={() => onResume(source.blogId)}
								disabled={isResumePending}
								accessibilityRole="button"
								accessibilityLabel={`${getBlogDisplayName(source.blogId)} 수집 재개`}
							>
								<Text className="text-xs font-semibold text-foreground dark:text-white">
									수집 재개
								</Text>
							</TouchableOpacity>
						) : null}
					</View>
				);
			})}
		</View>
	);
}
