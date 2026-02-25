import { useFavoriteRemove, useFavorites } from "@/lib/hooks/useFavorites";
import { Star } from "lucide-react-native";
import { useState } from "react";
import {
	Alert,
	FlatList,
	Image,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

interface FavoriteLinksProps {
	onSelectUrl: (url: string) => void;
}

export function FavoriteLinks({ onSelectUrl }: FavoriteLinksProps) {
	const { data: favorites } = useFavorites();
	const removeFavorite = useFavoriteRemove();

	if (!favorites || favorites.length === 0) {
		return (
			<View className="mt-7 px-5">
				<Text className="text-base font-bold text-foreground mb-3">
					즐겨찾기
				</Text>
				<View className="items-center py-6 bg-card rounded-xl border border-border">
					<Star size={24} color="#ddd" />
					<Text className="text-[13px] text-muted-foreground mt-2">
						자주 방문하는 페이지를 즐겨찾기에 추가해보세요
					</Text>
				</View>
			</View>
		);
	}

	const handleLongPress = (url: string, title: string) => {
		Alert.alert(
			"즐겨찾기 삭제",
			`"${title}" 을(를) 즐겨찾기에서 삭제하시겠습니까?`,
			[
				{ text: "취소", style: "cancel" },
				{
					text: "삭제",
					style: "destructive",
					onPress: () => removeFavorite.mutate(url),
				},
			],
		);
	};

	return (
		<View className="mt-7">
			<View className="flex-row justify-between items-center mb-4 px-5">
				<Text className="text-base font-bold text-foreground">즐겨찾기</Text>
			</View>
			<FlatList
				data={favorites}
				keyExtractor={(item) => item.id}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerClassName="px-4 gap-1"
				renderItem={({ item }) => (
					<FavoriteItem
						item={item}
						onPress={onSelectUrl}
						onLongPress={handleLongPress}
					/>
				)}
			/>
		</View>
	);
}

function FavoriteItem({
	item,
	onPress,
	onLongPress,
}: {
	item: { url: string; title: string; favIconUrl?: string };
	onPress: (url: string) => void;
	onLongPress: (url: string, title: string) => void;
}) {
	const [imgError, setImgError] = useState(false);
	let domain = "";
	try {
		domain = new URL(item.url).hostname.replace("www.", "");
	} catch {}

	return (
		<TouchableOpacity
			className="w-[76px] items-center gap-2"
			onPress={() => onPress(item.url)}
			onLongPress={() => onLongPress(item.url, item.title || domain)}
			activeOpacity={0.7}
		>
			<View className="w-14 h-14 rounded-[14px] bg-input justify-center items-center overflow-hidden">
				{item.favIconUrl && !imgError ? (
					<Image
						source={{ uri: item.favIconUrl }}
						style={{ width: 28, height: 28, borderRadius: 4 }}
						onError={() => setImgError(true)}
						resizeMode="contain"
					/>
				) : (
					<View
						className="justify-center items-center bg-[#e0e0e0]"
						style={{ width: 36, height: 36, borderRadius: 4 }}
					>
						<Text className="text-base font-bold text-gray-500">
							{(domain || "?").charAt(0).toUpperCase()}
						</Text>
					</View>
				)}
			</View>
			<Text
				className="text-[11px] text-secondary-foreground text-center leading-[14px]"
				numberOfLines={1}
			>
				{domain || item.title}
			</Text>
		</TouchableOpacity>
	);
}
