import {
	Heart,
	Home,
	LayoutGrid,
	RotateCw,
	Search,
	Star,
	X,
} from "lucide-react-native";
import { TextInput, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import type WebView from "react-native-webview";

type AnimatedViewStyle = React.ComponentProps<typeof Animated.View>["style"];

interface BrowserHeaderProps {
	urlInput: string;
	currentUrl: string;
	isCurrentPageWish: boolean;
	isCurrentPageFavorite: boolean;
	headerWrapperStyle: AnimatedViewStyle;
	webViewRef: React.RefObject<WebView | null>;
	onUrlInputChange: (text: string) => void;
	onUrlSubmit: () => void;
	onGoHome: () => void;
	onOpenBlogSheet: () => void;
	onFavoriteToggle: () => void;
	onWishToggle: () => void;
}

export function BrowserHeader({
	urlInput,
	currentUrl,
	isCurrentPageWish,
	isCurrentPageFavorite,
	headerWrapperStyle,
	webViewRef,
	onUrlInputChange,
	onUrlSubmit,
	onGoHome,
	onOpenBlogSheet,
	onFavoriteToggle,
	onWishToggle,
}: BrowserHeaderProps) {
	return (
		<Animated.View className="overflow-hidden" style={headerWrapperStyle}>
			<View className="flex-row items-center px-1.5 py-1.5 gap-0.5 border-b border-border bg-white">
				<View className="flex-1 flex-row items-center bg-input rounded-[10px] px-2.5 py-2 gap-1.5">
					<Search size={14} color="#999" />
					<TextInput
						className="flex-1 text-sm text-[#333] p-0"
						value={urlInput}
						onChangeText={onUrlInputChange}
						onFocus={() => onUrlInputChange(currentUrl)}
						onSubmitEditing={onUrlSubmit}
						placeholder="Search or enter URL"
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="url"
						returnKeyType="go"
						selectTextOnFocus
					/>
					{urlInput.length > 0 && (
						<TouchableOpacity onPress={() => onUrlInputChange("")} hitSlop={8}>
							<X size={14} color="#999" />
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity
					onPress={() => webViewRef.current?.reload()}
					className="p-1.5"
				>
					<RotateCw size={16} color="#111" />
				</TouchableOpacity>
				<TouchableOpacity onPress={onGoHome} className="p-1.5">
					<Home size={16} color="#111" />
				</TouchableOpacity>
				<TouchableOpacity onPress={onOpenBlogSheet} className="p-1.5">
					<LayoutGrid size={16} color="#111" />
				</TouchableOpacity>
				<TouchableOpacity onPress={onFavoriteToggle} className="p-1.5">
					<Star
						size={16}
						color={isCurrentPageFavorite ? "#f59e0b" : "#111"}
						fill={isCurrentPageFavorite ? "#f59e0b" : "none"}
					/>
				</TouchableOpacity>
				<TouchableOpacity onPress={onWishToggle} className="p-1.5">
					<Heart
						size={16}
						color={isCurrentPageWish ? "#ec4899" : "#111"}
						fill={isCurrentPageWish ? "#ec4899" : "none"}
					/>
				</TouchableOpacity>
			</View>
		</Animated.View>
	);
}
