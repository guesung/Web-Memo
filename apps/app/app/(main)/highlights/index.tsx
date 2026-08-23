import type { HighlightRow } from "@web-memo/shared/types";
import { useRouter } from "expo-router";
import { Highlighter, LogIn } from "lucide-react-native";
import {
	ActivityIndicator,
	FlatList,
	Text,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HighlightFilterBar } from "./_components/HighlightFilterBar";
import { HighlightGroupCard } from "./_components/HighlightGroupCard";
import { useHighlightScreen } from "./_hooks/useHighlightScreen";

export default function HighlightScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const isDark = useColorScheme() === "dark";
	const {
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
	} = useHighlightScreen();

	const emptyStateIconColor = isDark ? "#404040" : "#ddd";

	const handleHighlightPress = (highlight: HighlightRow) => {
		router.navigate({
			pathname: "/(main)/browser",
			params: { url: encodeURIComponent(highlight.url), t: String(Date.now()) },
		});
	};

	return (
		<View
			className="flex-1 bg-background dark:bg-neutral-950"
			style={{ paddingTop: insets.top }}
		>
			<View className="px-5 pt-4 pb-1">
				<Text className="text-[22px] font-extrabold text-foreground dark:text-white tracking-tight">
					하이라이트
				</Text>
			</View>
			<Text className="text-sm text-gray-400 dark:text-neutral-500 px-5 mb-4">
				브라우저에서 밑줄 그은 문장을 모아봅니다
			</Text>

			{!isLoggedIn ? (
				<View className="flex-1 items-center justify-center px-8 gap-3">
					<LogIn size={40} color={emptyStateIconColor} />
					<Text className="text-sm text-center text-muted-foreground dark:text-neutral-400">
						로그인하면 브라우저에서 그은 하이라이트를 모아볼 수 있어요
					</Text>
					<TouchableOpacity
						className="px-4 py-2 rounded-full bg-foreground dark:bg-neutral-700"
						onPress={() => router.navigate("/(auth)/login")}
					>
						<Text className="text-xs font-semibold text-white">로그인</Text>
					</TouchableOpacity>
				</View>
			) : (
				<>
					<HighlightFilterBar
						searchInput={searchInput}
						selectedColor={selectedColor}
						onSearchInputChange={setSearchInput}
						onColorChange={setSelectedColor}
					/>

					{isLoading ? (
						<ActivityIndicator className="mt-10" />
					) : (
						<FlatList
							data={groups}
							keyExtractor={(group) => group.url}
							renderItem={({ item }) => (
								<HighlightGroupCard
									group={item}
									count={highlightCounts.get(item.url) ?? 0}
									onHighlightPress={handleHighlightPress}
								/>
							)}
							onEndReached={handleEndReached}
							onEndReachedThreshold={0.5}
							onRefresh={refetch}
							refreshing={false}
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={{ paddingBottom: 24 }}
							ListEmptyComponent={
								<View className="items-center justify-center px-8 pt-20 gap-3">
									<Highlighter size={40} color={emptyStateIconColor} />
									<Text className="text-sm text-center text-muted-foreground dark:text-neutral-400">
										{isFiltering
											? "검색 결과가 없어요"
											: "아직 하이라이트가 없어요\n브라우저에서 문장을 선택해 밑줄을 그어보세요"}
									</Text>
								</View>
							}
							ListFooterComponent={
								isFetchingNextPage ? (
									<ActivityIndicator className="my-4" />
								) : null
							}
						/>
					)}
				</>
			)}
		</View>
	);
}
