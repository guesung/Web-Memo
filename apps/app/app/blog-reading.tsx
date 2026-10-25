import type {
	IFBlogArticleItem,
	TBlogId,
} from "@web-memo/shared/types/blog-reading";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import {
	RefreshControl,
	ScrollView,
	Text,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlogArticleRow } from "@/components/blog-reading/BlogArticleRow";
import { BlogMemoViewer } from "@/components/blog-reading/BlogMemoViewer";
import { BlogReadingPagination } from "@/components/blog-reading/BlogReadingPagination";
import { BlogReadingStateView } from "@/components/blog-reading/BlogReadingStateView";
import { BlogSourceStatusCard } from "@/components/blog-reading/BlogSourceStatusCard";
import { BlogSubscriptionModal } from "@/components/blog-reading/BlogSubscriptionModal";
import { getBlogDisplayName } from "@/components/blog-reading/blogSourceStatusCopy";
import { useBlogReading } from "@/lib/hooks/useBlogReading";
import { useMemoUpsertMutation } from "@/lib/hooks/useMemoMutation";

/**
 * 블로그 정주행 체크리스트 화면. 메모 홈 진입 카드에서 root Stack으로 들어온다.
 * @description 토스·당근 공개 글을 30개씩 쪽 이동으로 읽는다. 완료 표시는 메모로 계산되는 읽기 전용 값이다.
 */
export default function BlogReadingScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const isDark = useColorScheme() === "dark";
	const reading = useBlogReading();
	const upsertMemo = useMemoUpsertMutation();
	const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
	const [memoViewArticle, setMemoViewArticle] =
		useState<IFBlogArticleItem | null>(null);

	const { scopeTotals } = reading;
	const isAllCollectedMemoed =
		scopeTotals.confirmedTotal === null &&
		scopeTotals.collectedCount > 0 &&
		scopeTotals.completedCount >= scopeTotals.collectedCount;
	const summaryText =
		scopeTotals.confirmedTotal === null
			? `현재 수집한 글 ${scopeTotals.collectedCount}개 · 메모 완료 ${scopeTotals.completedCount}개`
			: `전체 글 ${scopeTotals.confirmedTotal}개 · 메모할 글 ${scopeTotals.confirmedTotal - scopeTotals.completedCount}개 · 메모 완료 ${scopeTotals.completedCount}개`;

	/** 정주행에서 연 원문임을 알리는 `source`를 실어 기존 앱 브라우저로 연다. */
	const handleArticleOpen = (article: IFBlogArticleItem) => {
		router.navigate({
			pathname: "/(main)/browser",
			params: {
				url: encodeURIComponent(article.url),
				t: String(Date.now()),
				newTab: "1",
				source: "blog-reading",
			},
		});
	};

	const handleMemoViewClose = () => setMemoViewArticle(null);

	const handleMemoViewNavigate = (url: string) => {
		const article = memoViewArticle;
		setMemoViewArticle(null);
		if (article) {
			handleArticleOpen({ ...article, url });
		}
	};

	const handleMemoNotFound = () => {
		setMemoViewArticle(null);
		reading.setNotice("메모를 찾지 못했어요. 원문에서 확인해 주세요.");
	};

	const handleLoginPress = () => router.navigate("/(auth)/login");

	const filterOptions: { blogId: TBlogId | null; label: string }[] = [
		{ blogId: null, label: "전체" },
		...reading.subscribedSources.map((source) => ({
			blogId: source.blogId,
			label: getBlogDisplayName(source.blogId),
		})),
	];

	return (
		<View
			className="flex-1 bg-white dark:bg-neutral-950"
			style={{ paddingTop: insets.top }}
		>
			<View className="flex-row items-center justify-between px-3 pt-4 pb-2">
				<View className="flex-row items-center gap-2">
					<TouchableOpacity
						onPress={() => router.back()}
						hitSlop={8}
						accessibilityRole="button"
						accessibilityLabel="메모 홈으로 돌아가기"
					>
						<ChevronLeft size={24} color={isDark ? "#fff" : "#111"} />
					</TouchableOpacity>
					<Text className="text-[22px] font-extrabold text-foreground dark:text-white tracking-tight">
						블로그 정주행
					</Text>
				</View>
				{reading.fullState !== "login" ? (
					<TouchableOpacity
						className="px-3 py-1.5 rounded-full bg-foreground dark:bg-neutral-700"
						onPress={() => setIsSubscriptionModalOpen(true)}
						accessibilityRole="button"
					>
						<Text className="text-xs font-semibold text-white">
							블로그 선택
						</Text>
					</TouchableOpacity>
				) : null}
			</View>
			<Text className="text-sm text-gray-400 dark:text-neutral-500 px-5 mb-4">
				공개된 글을 처음부터 읽고 메모를 남겨요.
			</Text>

			{reading.fullState ? (
				<BlogReadingStateView
					state={reading.fullState}
					onLogin={handleLoginPress}
					onSelectBlog={() => setIsSubscriptionModalOpen(true)}
					onRetry={reading.handleRetry}
				/>
			) : (
				<ScrollView
					contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
					refreshControl={
						<RefreshControl
							refreshing={false}
							onRefresh={reading.handleRetry}
						/>
					}
				>
					{reading.inlineErrorMessage ? (
						<View className="flex-row items-center justify-between gap-3 mx-5 mb-4 p-3 rounded-xl bg-muted dark:bg-neutral-800">
							<Text className="flex-1 text-xs text-foreground dark:text-white">
								{reading.inlineErrorMessage}
							</Text>
							<TouchableOpacity
								className="px-3 py-1.5 rounded-lg border border-border dark:border-neutral-600"
								onPress={reading.handleRetry}
								accessibilityRole="button"
							>
								<Text className="text-xs text-foreground dark:text-white">
									재시도
								</Text>
							</TouchableOpacity>
						</View>
					) : null}

					<View
						className="flex-row flex-wrap px-5 mb-4 gap-2"
						accessibilityLabel="블로그 선택"
					>
						{filterOptions.map((option) => {
							const isSelected = reading.sourceFilter === option.blogId;

							return (
								<TouchableOpacity
									key={option.label}
									className={`px-3.5 py-[7px] rounded-[20px] ${isSelected ? "bg-foreground dark:bg-neutral-700" : "bg-muted dark:bg-neutral-800"}`}
									onPress={() =>
										reading.handleSourceFilterChange(option.blogId)
									}
									accessibilityRole="button"
									accessibilityState={{ selected: isSelected }}
								>
									<Text
										className={`text-[13px] font-semibold ${isSelected ? "text-white" : "text-gray-500 dark:text-neutral-400"}`}
									>
										{option.label}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>

					<BlogSourceStatusCard
						sources={reading.scopeSources}
						isResumePending={reading.isResumeRequesting}
						onResume={reading.handleResumeRequest}
					/>

					<View className="flex-row items-center justify-between gap-2 px-5 mb-1">
						<Text className="flex-1 text-xs text-muted-foreground dark:text-neutral-400">
							{summaryText}
						</Text>
						<View className="flex-row gap-1.5" accessibilityLabel="글 정렬">
							{(
								[
									{ value: "oldest", label: "과거부터" },
									{ value: "newest", label: "최신순" },
								] as const
							).map((option) => {
								const isSelected = reading.sort === option.value;

								return (
									<TouchableOpacity
										key={option.value}
										className={`px-3 py-1.5 rounded-full ${isSelected ? "bg-foreground dark:bg-neutral-700" : "bg-muted dark:bg-neutral-800"}`}
										onPress={() => reading.handleSortChange(option.value)}
										accessibilityRole="button"
										accessibilityState={{ selected: isSelected }}
									>
										<Text
											className={`text-xs font-semibold ${isSelected ? "text-white" : "text-gray-500 dark:text-neutral-400"}`}
										>
											{option.label}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
					{isAllCollectedMemoed ? (
						<Text className="px-5 mb-1 text-xs text-muted-foreground dark:text-neutral-400">
							현재 수집한 글에는 모두 메모를 남겼어요
						</Text>
					) : null}

					{reading.newArticleCount > 0 ? (
						<View className="flex-row items-center justify-between gap-3 mx-5 mt-2 p-3 rounded-xl bg-muted dark:bg-neutral-800">
							<Text className="flex-1 text-xs text-foreground dark:text-white">
								새로 가져온 글 {reading.newArticleCount}개
							</Text>
							<TouchableOpacity
								className="px-3 py-1.5 rounded-lg border border-border dark:border-neutral-600"
								onPress={reading.handleCatalogRefresh}
								accessibilityRole="button"
								accessibilityLabel={`새로 가져온 글 ${reading.newArticleCount}개 목록 갱신`}
							>
								<Text className="text-xs text-foreground dark:text-white">
									목록 갱신
								</Text>
							</TouchableOpacity>
						</View>
					) : null}

					<View className="mx-5 mt-3 rounded-xl border border-border dark:border-neutral-800 bg-card dark:bg-neutral-900 overflow-hidden">
						{reading.articles.map((article) => (
							<BlogArticleRow
								key={`${article.blogId}:${article.providerId}`}
								article={article}
								onOpenArticle={handleArticleOpen}
								onWriteMemo={handleArticleOpen}
								onViewMemo={setMemoViewArticle}
							/>
						))}
						{reading.articles.length === 0 ? (
							<Text className="px-4 py-8 text-center text-[13px] text-muted-foreground dark:text-neutral-400">
								{reading.isPageLoading
									? "글을 불러오고 있어요."
									: "아직 가져온 글이 없어요. 수집이 시작되면 여기에 보여요."}
							</Text>
						) : null}
					</View>

					<BlogReadingPagination
						pageIndex={reading.pageIndex}
						visibleCount={reading.articles.length}
						confirmedTotal={scopeTotals.confirmedTotal}
						hasNextPage={reading.hasNextPage}
						isFetchingNextPage={reading.isFetchingNextPage}
						onPrevious={reading.handlePreviousPage}
						onNext={reading.handleNextPage}
					/>
				</ScrollView>
			)}

			<BlogSubscriptionModal
				visible={isSubscriptionModalOpen}
				subscribedBlogIds={reading.subscribedSources.map(
					(source) => source.blogId,
				)}
				isChanging={reading.isSubscriptionChanging}
				onClose={() => setIsSubscriptionModalOpen(false)}
				onToggleSubscription={reading.handleSubscriptionToggle}
			/>

			<BlogMemoViewer
				key={memoViewArticle?.pageKey ?? "none"}
				article={memoViewArticle}
				onClose={handleMemoViewClose}
				onNavigate={handleMemoViewNavigate}
				onMemoNotFound={handleMemoNotFound}
				onSave={(memo, next) =>
					upsertMemo.mutate({
						url: memo.url,
						selectedId: typeof memo.id === "number" ? memo.id : undefined,
						title: next.title,
						memo: next.memo,
						impression: next.impression,
						actionItem: next.actionItem,
					})
				}
			/>

			{reading.notice ? (
				<View
					className="absolute self-center bg-black/80 px-4 py-2.5 rounded-[20px]"
					style={{ bottom: insets.bottom + 24 }}
					accessibilityLiveRegion="polite"
				>
					<Text className="text-white text-sm font-semibold">
						{reading.notice}
					</Text>
				</View>
			) : null}
		</View>
	);
}
