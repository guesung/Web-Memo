import {
	Home,
	LayoutGrid,
	MoreHorizontal,
	RotateCw,
	Search,
	X,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { TextInput, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import type WebView from "react-native-webview";

type AnimatedViewStyle = React.ComponentProps<typeof Animated.View>["style"];

interface BrowserHeaderProps {
	urlInput: string;
	currentUrl: string;
	hasActiveStatus: boolean;
	headerWrapperStyle: AnimatedViewStyle;
	webViewRef: React.RefObject<WebView | null>;
	onUrlInputChange: (text: string) => void;
	onUrlSubmit: () => void;
	onGoHome: () => void;
	onOpenBlogSheet: () => void;
	onOpenActions: () => void;
}

export function BrowserHeader({
	urlInput,
	currentUrl,
	hasActiveStatus,
	headerWrapperStyle,
	webViewRef,
	onUrlInputChange,
	onUrlSubmit,
	onGoHome,
	onOpenBlogSheet,
	onOpenActions,
}: BrowserHeaderProps) {
	const isDark = useColorScheme().colorScheme === "dark";

	return (
		<Animated.View className="overflow-hidden" style={headerWrapperStyle}>
			<View className="flex-row items-center px-1.5 py-1.5 gap-0.5 border-b border-border dark:border-neutral-800 bg-white dark:bg-neutral-900">
				<View className="flex-1 flex-row items-center bg-input dark:bg-neutral-800 rounded-[10px] px-2.5 py-2 gap-1.5">
					<Search size={14} color={isDark ? "#777" : "#999"} />
					<TextInput
						className="flex-1 text-sm text-[#333] dark:text-white p-0"
						value={urlInput}
						onChangeText={onUrlInputChange}
						onFocus={() => onUrlInputChange(currentUrl)}
						onSubmitEditing={onUrlSubmit}
						placeholder="Search or enter URL"
						placeholderTextColor={isDark ? "#666" : "#999"}
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="url"
						returnKeyType="go"
						selectTextOnFocus
					/>
					{urlInput.length > 0 && (
						<TouchableOpacity onPress={() => onUrlInputChange("")} hitSlop={8}>
							<X size={14} color={isDark ? "#777" : "#999"} />
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity
					onPress={() => webViewRef.current?.reload()}
					className="p-1.5"
				>
					<RotateCw size={16} color={isDark ? "#eee" : "#111"} />
				</TouchableOpacity>
				<TouchableOpacity onPress={onGoHome} className="p-1.5">
					<Home size={16} color={isDark ? "#eee" : "#111"} />
				</TouchableOpacity>
				<TouchableOpacity onPress={onOpenBlogSheet} className="p-1.5">
					<LayoutGrid size={16} color={isDark ? "#eee" : "#111"} />
				</TouchableOpacity>
				<TouchableOpacity onPress={onOpenActions} className="p-1.5">
					<View>
						<MoreHorizontal size={16} color={isDark ? "#eee" : "#111"} />
						{hasActiveStatus && (
							<View className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
						)}
					</View>
				</TouchableOpacity>
			</View>
		</Animated.View>
	);
}
