import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	getPendingSharedUrls,
	type IFPendingSharedUrl,
} from "@/lib/sharing/shareHandler";
import {
	getPendingMemoSyncs,
	type IFPendingMemoSync,
} from "@/lib/storage/syncService";

/** 보류된 동기화 초안과 공유 URL에서 해당 브라우저 페이지로 이동한다. */
export default function PendingMemosScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [pendingSyncs, setPendingSyncs] = useState<IFPendingMemoSync[] | null>(
		null,
	);
	const [pendingShares, setPendingShares] = useState<
		IFPendingSharedUrl[] | null
	>(null);

	useEffect(() => {
		Promise.all([getPendingMemoSyncs(), getPendingSharedUrls()]).then(
			([syncs, shares]) => {
				setPendingSyncs(syncs);
				setPendingShares(shares);
			},
		);
	}, []);

	const openUrl = (url: string) => {
		router.replace({
			pathname: "/(main)/browser",
			params: { url, t: String(Date.now()) },
		});
	};

	return (
		<View
			className="flex-1 bg-white dark:bg-neutral-950"
			style={{ paddingTop: insets.top }}
		>
			<Text className="px-5 py-4 text-xl font-bold text-foreground dark:text-white">
				보류된 메모
			</Text>
			{pendingSyncs === null || pendingShares === null ? (
				<ActivityIndicator />
			) : (
				<ScrollView className="px-5">
					{pendingSyncs.length + pendingShares.length === 0 && (
						<Text className="text-gray-500">보류된 메모가 없습니다.</Text>
					)}
					{pendingSyncs.map((item) => (
						<TouchableOpacity
							key={item.localId}
							accessibilityRole="button"
							onPress={() => openUrl(item.url)}
							className="p-4 mb-2 border border-border dark:border-neutral-700 rounded-lg"
						>
							<Text className="font-semibold text-foreground dark:text-white">
								동기화 초안 선택
							</Text>
							<Text className="text-gray-500" numberOfLines={2}>
								{item.url}
							</Text>
						</TouchableOpacity>
					))}
					{pendingShares.map((item) => (
						<TouchableOpacity
							key={item.url}
							accessibilityRole="button"
							onPress={() => openUrl(item.url)}
							className="p-4 mb-2 border border-border dark:border-neutral-700 rounded-lg"
						>
							<Text className="font-semibold text-foreground dark:text-white">
								공유 요청 선택: {item.title}
							</Text>
							<Text className="text-gray-500" numberOfLines={2}>
								{item.url}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			)}
		</View>
	);
}
