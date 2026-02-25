import { useRouter } from "expo-router";
import { Globe, Heart, LogIn, Undo2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MemoCard, type MemoItem } from "./_components/MemoCard";
import { MemoDetailModal } from "./_components/MemoDetailModal";
import { useDeleteWithUndo } from "./_hooks/useDeleteWithUndo";
import { useMemoList } from "./_hooks/useMemoList";

export default function MemoScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const [selectedMemo, setSelectedMemo] = useState<MemoItem | null>(null);

	const {
		isLoggedIn,
		filter,
		setFilter,
		memos,
		isLoading,
		refetch,
		isFetchingNextPage,
		handleEndReached,
		handleWishRemove,
	} = useMemoList();

	const { deletedMemo, handleDelete, handleUndo } = useDeleteWithUndo();

	const navigateToBrowser = useCallback(
		(url: string) => {
			router.navigate({
				pathname: "/(main)/browser",
				params: { url: encodeURIComponent(url) },
			});
		},
		[router],
	);

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
			<View className="flex-1">
				<View className="flex-row justify-between items-center px-5 pt-4 pb-1">
					<Text className="text-[22px] font-extrabold text-foreground tracking-tight">
						Web Memo
					</Text>
					{!isLoggedIn ? (
						<TouchableOpacity
							className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground"
							onPress={() => router.navigate("/(auth)/login")}
						>
							<LogIn size={14} color="#fff" />
							<Text className="text-xs font-semibold text-white">로그인</Text>
						</TouchableOpacity>
					) : null}
				</View>

				<Text className="text-sm text-gray-400 px-5 mb-4">
					웹서핑하며 메모하세요
				</Text>

				{!isLoggedIn ? (
					<TouchableOpacity
						className="flex-row items-center gap-2 mx-5 mb-3 px-3.5 py-2.5 bg-card rounded-xl border border-border"
						onPress={() => router.navigate("/(auth)/login")}
						activeOpacity={0.7}
					>
						<LogIn size={14} color="#7c3aed" />
						<Text className="flex-1 text-[13px] text-secondary-foreground">
							로그인하면 메모가 동기화됩니다
						</Text>
						<Text className="text-xs text-accent font-semibold">로그인</Text>
					</TouchableOpacity>
				) : null}

				<View className="flex-row px-5 mb-4 gap-2">
					<TouchableOpacity
						className={`flex-row items-center gap-1 px-3.5 py-[7px] rounded-[20px] ${filter === "all" ? "bg-foreground" : "bg-muted"}`}
						onPress={() => setFilter("all")}
					>
						<Text
							className={`text-[13px] font-semibold ${filter === "all" ? "text-white" : "text-gray-500"}`}
						>
							전체
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						className={`flex-row items-center gap-1 px-3.5 py-[7px] rounded-[20px] ${filter === "wish" ? "bg-foreground" : "bg-muted"}`}
						onPress={() => setFilter("wish")}
					>
						<Heart
							size={12}
							fill={filter === "wish" ? "#fff" : "#666"}
							color={filter === "wish" ? "#fff" : "#666"}
						/>
						<Text
							className={`text-[13px] font-semibold ${filter === "wish" ? "text-white" : "text-gray-500"}`}
						>
							위시리스트
						</Text>
					</TouchableOpacity>
				</View>

				{isLoading ? (
					<ActivityIndicator style={{ marginTop: 40 }} size="large" />
				) : memos.length > 0 ? (
					<View className="flex-1 px-5">
						<Text className="text-[17px] font-bold text-foreground mb-3">
							{filter === "wish" ? "위시리스트" : "최근 메모"}
						</Text>
						<FlatList
							data={memos}
							keyExtractor={(item) => String(item.id)}
							renderItem={({ item }) => (
								<MemoCard
									memo={item}
									onPress={() => setSelectedMemo(item)}
									onDelete={() => handleDelete(item)}
								/>
							)}
							contentContainerStyle={{ paddingBottom: 8 }}
							onRefresh={() => refetch()}
							refreshing={false}
							onEndReached={handleEndReached}
							onEndReachedThreshold={0.5}
							ListFooterComponent={
								isFetchingNextPage ? (
									<ActivityIndicator style={{ paddingVertical: 16 }} />
								) : null
							}
						/>
					</View>
				) : (
					<View className="items-center pt-[60px] gap-3">
						{filter === "wish" ? (
							<Heart size={48} color="#ddd" />
						) : (
							<Globe size={48} color="#ddd" />
						)}
						<Text className="text-base font-semibold text-muted-foreground">
							{filter === "wish"
								? "위시리스트가 비어있습니다"
								: "저장된 메모가 없습니다"}
						</Text>
						<Text className="text-[13px] text-gray-300">
							{filter === "wish"
								? "브라우저에서 마음에 드는 페이지를 저장해보세요"
								: "브라우저에서 웹서핑하며 메모를 남겨보세요"}
						</Text>
						<TouchableOpacity
							className="mt-2 bg-foreground px-5 py-3 rounded-3xl"
							onPress={() => router.navigate("/(main)/browser")}
						>
							<Text className="text-sm font-semibold text-white">
								{filter === "wish"
									? "브라우저에서 페이지 저장하기"
									: "브라우저에서 웹서핑 시작하기"}
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>

			<MemoDetailModal
				memo={selectedMemo}
				onClose={() => setSelectedMemo(null)}
				onNavigate={(url) => {
					setSelectedMemo(null);
					navigateToBrowser(url);
				}}
				onWishRemove={(memo) => {
					handleWishRemove(memo);
					setSelectedMemo(null);
				}}
			/>

			{deletedMemo ? (
				<View
					className="absolute left-5 right-5 flex-row items-center justify-between bg-[#333] px-4 py-3 rounded-xl"
					style={{ bottom: insets.bottom + 24 }}
				>
					<Text className="text-white text-sm font-medium">
						메모가 삭제되었습니다
					</Text>
					<TouchableOpacity
						className="flex-row items-center gap-1"
						onPress={handleUndo}
					>
						<Undo2 size={14} color="#60a5fa" />
						<Text className="text-blue-400 text-sm font-semibold">
							되돌리기
						</Text>
					</TouchableOpacity>
				</View>
			) : null}
		</View>
	);
}
