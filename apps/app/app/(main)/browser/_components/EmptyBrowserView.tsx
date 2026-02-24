import { Search } from "lucide-react-native";
import { ScrollView, TextInput, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { TechBlogLinks } from "./TechBlogLinks";

interface EmptyBrowserViewProps {
	insets: EdgeInsets;
	urlInput: string;
	onUrlInputChange: (text: string) => void;
	onUrlSubmit: () => void;
	onSelectBlog: (url: string) => void;
}

export function EmptyBrowserView({
	insets,
	urlInput,
	onUrlInputChange,
	onUrlSubmit,
	onSelectBlog,
}: EmptyBrowserViewProps) {
	return (
		<View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
			<ScrollView className="flex-1 pt-4" keyboardShouldPersistTaps="handled">
				<View className="px-5">
					<View className="flex-row items-center bg-input rounded-[14px] px-3.5 py-3 gap-2.5">
						<Search size={18} color="#999" />
						<TextInput
							className="flex-1 text-base text-[#333] p-0"
							value={urlInput}
							onChangeText={onUrlInputChange}
							onSubmitEditing={onUrlSubmit}
							placeholder="검색어를 입력하세요"
							placeholderTextColor="#999"
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="default"
							returnKeyType="go"
						/>
					</View>
				</View>
				<TechBlogLinks onSelectBlog={onSelectBlog} />
			</ScrollView>
		</View>
	);
}
