import { URL } from "@web-memo/shared/constants";
import { ChevronRight, MessageCircle } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
	FlatList,
	Image,
	Linking,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import {
	BLOG_AGGREGATORS,
	BLOG_LOGO_BASE_URL,
	QUICK_ACCESS_COUNT,
	TECH_BLOGS,
	type TechBlog,
} from "../_constants/techBlogData";
import { TechBlogBottomSheet } from "./TechBlogBottomSheet";

function BlogItem({
	blog,
	onPress,
}: {
	blog: TechBlog;
	onPress: (url: string) => void;
}) {
	const [imgError, setImgError] = useState(false);
	const logoUri = blog.logo
		? blog.logo.startsWith("http")
			? blog.logo
			: `${BLOG_LOGO_BASE_URL}${blog.logo}`
		: "";

	return (
		<TouchableOpacity
			className="w-[76px] items-center gap-2"
			onPress={() => onPress(blog.url)}
			activeOpacity={0.7}
		>
			<View className="w-14 h-14 rounded-[14px] bg-input justify-center items-center overflow-hidden">
				{!logoUri || imgError ? (
					<View
						className="justify-center items-center bg-[#e0e0e0]"
						style={{ width: 36, height: 36, borderRadius: 4 }}
					>
						<Text className="text-base font-bold text-gray-500">
							{blog.name.charAt(0)}
						</Text>
					</View>
				) : (
					<Image
						source={{ uri: logoUri }}
						style={{ width: 36, height: 36, borderRadius: 4 }}
						onError={() => setImgError(true)}
						resizeMode="contain"
					/>
				)}
			</View>
			<Text
				className="text-[11px] text-secondary-foreground text-center leading-[14px]"
				numberOfLines={1}
			>
				{blog.name}
			</Text>
		</TouchableOpacity>
	);
}

export function TechBlogLinks({
	onSelectBlog,
}: {
	onSelectBlog: (url: string) => void;
}) {
	const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

	const renderItem = useCallback(
		({ item }: { item: TechBlog }) => (
			<BlogItem blog={item} onPress={onSelectBlog} />
		),
		[onSelectBlog],
	);

	return (
		<View className="mt-8">
			<View className="flex-row justify-between items-center mb-4 px-5">
				<Text className="text-base font-bold text-foreground">블로그 모음</Text>
				<TouchableOpacity
					className="flex-row items-center gap-0.5"
					onPress={() => setIsBottomSheetVisible(true)}
					activeOpacity={0.7}
				>
					<Text className="text-[13px] text-muted-foreground">전체보기</Text>
					<ChevronRight size={14} color="#999" />
				</TouchableOpacity>
			</View>

			<FlatList
				data={BLOG_AGGREGATORS}
				renderItem={renderItem}
				keyExtractor={(item) => item.url}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerClassName="px-4 gap-1"
			/>

			<View className="mt-7 mb-4 px-5">
				<Text className="text-base font-bold text-foreground">테크 블로그</Text>
			</View>

			<FlatList
				data={TECH_BLOGS.slice(0, QUICK_ACCESS_COUNT)}
				renderItem={renderItem}
				keyExtractor={(item) => item.url}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerClassName="px-4 gap-1"
			/>

			<TouchableOpacity
				className="flex-row items-center justify-center gap-1.5 mt-8 mb-4 py-3 mx-5 rounded-xl bg-input"
				onPress={() => Linking.openURL(URL.kakaoTalk)}
				activeOpacity={0.7}
			>
				<MessageCircle size={16} color="#666" />
				<Text className="text-sm text-gray-500 font-medium">
					블로그 추가 문의하기
				</Text>
			</TouchableOpacity>

			<TechBlogBottomSheet
				visible={isBottomSheetVisible}
				onClose={() => setIsBottomSheetVisible(false)}
				onSelectBlog={(url) => {
					setIsBottomSheetVisible(false);
					onSelectBlog(url);
				}}
			/>
		</View>
	);
}
