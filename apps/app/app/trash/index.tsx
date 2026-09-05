import type { GetMemoResponse } from "@web-memo/shared/types";
import { useRouter } from "expo-router";
import { ChevronLeft, RotateCcw, Trash2 } from "lucide-react-native";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Text,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	type TTrashMemo,
	type TTrashMemoId,
	useDeletedMemos,
	useDeleteMemoPermanently,
	useRestoreMemo,
} from "@/lib/hooks/useTrash";
import type { LocalMemo } from "@/lib/storage/localMemo";

/**
 * 휴지통 항목에서 화면에 필요한 값만 뽑는다.
 * @description 로그인 사용자는 Supabase 행(`deleted_at`, id가 number), 비로그인
 * 사용자는 로컬 메모(`deletedAt`, id가 string)라 필드명과 id 타입이 다르다.
 */
function toTrashItemView(memo: TTrashMemo) {
	const isLocalMemo = typeof memo.id === "string";

	return {
		id: memo.id as TTrashMemoId,
		title: memo.title,
		url: memo.url,
		deletedAt: isLocalMemo
			? (memo as LocalMemo).deletedAt
			: (memo as GetMemoResponse).deleted_at,
	};
}

export default function TrashScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const isDark = useColorScheme() === "dark";
	const { data: deletedMemos, isLoading } = useDeletedMemos();
	const restoreMemo = useRestoreMemo();
	const deletePermanently = useDeleteMemoPermanently();

	const handleDeletePermanentlyPress = (id: TTrashMemoId, title: string) => {
		Alert.alert("완전히 삭제할까요?", `"${title}" 는 되돌릴 수 없습니다.`, [
			{ text: "취소", style: "cancel" },
			{
				text: "완전히 삭제",
				style: "destructive",
				onPress: () => deletePermanently.mutate(id),
			},
		]);
	};

	return (
		<View
			className="flex-1 bg-white dark:bg-neutral-950"
			style={{ paddingTop: insets.top }}
		>
			<View className="flex-row items-center gap-2 px-3 pt-4 pb-4">
				<TouchableOpacity onPress={() => router.back()} hitSlop={8}>
					<ChevronLeft size={24} color={isDark ? "#fff" : "#111"} />
				</TouchableOpacity>
				<Text className="text-[22px] font-extrabold text-foreground dark:text-white tracking-tight">
					휴지통
				</Text>
			</View>

			{isLoading ? (
				<ActivityIndicator style={{ marginTop: 40 }} size="large" />
			) : (
				<FlatList
					data={deletedMemos ?? []}
					keyExtractor={(memo) => String(toTrashItemView(memo).id)}
					contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
					ListEmptyComponent={
						<Text className="mt-16 text-center text-[15px] text-muted-foreground dark:text-neutral-500">
							휴지통이 비어 있어요.
						</Text>
					}
					renderItem={({ item }) => {
						const view = toTrashItemView(item);

						return (
							<View className="mb-3 rounded-[14px] border border-muted dark:border-neutral-800 bg-card dark:bg-neutral-900 p-4">
								<Text
									className="text-[15px] font-medium text-foreground dark:text-white"
									numberOfLines={1}
								>
									{view.title}
								</Text>
								<Text
									className="mt-0.5 text-xs text-muted-foreground dark:text-neutral-500"
									numberOfLines={1}
								>
									{view.url}
								</Text>

								<View className="mt-3 flex-row gap-2">
									<TouchableOpacity
										className="flex-row items-center gap-1.5 rounded-[10px] border border-muted dark:border-neutral-700 px-3 py-2"
										onPress={() => restoreMemo.mutate(view.id)}
										activeOpacity={0.6}
									>
										<RotateCcw size={14} color={isDark ? "#a3a3a3" : "#555"} />
										<Text className="text-[13px] text-secondary-foreground dark:text-neutral-300">
											되살리기
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										className="flex-row items-center gap-1.5 rounded-[10px] px-3 py-2"
										onPress={() =>
											handleDeletePermanentlyPress(view.id, view.title)
										}
										activeOpacity={0.6}
									>
										<Trash2 size={14} color="#ef4444" />
										<Text className="text-[13px] text-red-500">
											완전히 삭제
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						);
					}}
				/>
			)}
		</View>
	);
}
