import { useRouter } from "expo-router";
import {
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MemoCard } from "@/components/memo/MemoCard";
import { useMemos } from "@/lib/hooks/useMemos";

export default function HomeScreen() {
	const router = useRouter();
	const { data: memos, isLoading, refetch } = useMemos();

	function handleMemoPress(url: string) {
		router.push(`/browser/${encodeURIComponent(url)}`);
	}

	return (
		<SafeAreaView style={styles.container} edges={["left", "right"]}>
			<FlatList
				data={memos}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<Pressable onPress={() => handleMemoPress(item.url)}>
						<MemoCard memo={item} />
					</Pressable>
				)}
				contentContainerStyle={styles.list}
				refreshControl={
					<RefreshControl refreshing={isLoading} onRefresh={refetch} />
				}
				ListEmptyComponent={
					<View style={styles.empty}>
						<Text style={styles.emptyText}>
							아직 저장된 메모가 없어요
						</Text>
						<Text style={styles.emptySubtext}>
							검색 탭에서 아티클을 열어 메모를 시작하세요
						</Text>
					</View>
				}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	list: {
		padding: 16,
		gap: 12,
	},
	empty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 48,
	},
	emptyText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#666",
		marginBottom: 8,
	},
	emptySubtext: {
		fontSize: 14,
		color: "#999",
	},
});
