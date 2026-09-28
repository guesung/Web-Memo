import { Monitor, X } from "lucide-react-native";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { WEB_API_ORIGIN } from "@/app/(main)/browser/_constants/webApi";

/** 로그인한 사용자에게 PC 웹에서도 메모를 볼 수 있다는 사실을 알리는 배너 */
export function WebNoticeBanner({ onDismiss }: { onDismiss: () => void }) {
	const handleOpenWebPress = () => {
		Linking.openURL(`${WEB_API_ORIGIN}/memos`);
	};

	return (
		<View className="flex-row items-center gap-2 mx-5 mb-3 px-3.5 py-2.5 bg-card dark:bg-neutral-900 rounded-xl border border-border dark:border-neutral-800">
			<Monitor size={14} color="#7c3aed" />
			<View className="flex-1">
				<Text className="text-[13px] font-semibold text-secondary-foreground dark:text-neutral-300">
					PC 웹에서도 메모를 볼 수 있어요
				</Text>
				<Text className="text-[13px] text-secondary-foreground dark:text-neutral-300">
					webmemo.xyz에 같은 계정으로 로그인하세요
				</Text>
			</View>
			<TouchableOpacity onPress={handleOpenWebPress}>
				<Text className="text-xs text-accent font-semibold">열기</Text>
			</TouchableOpacity>
			<TouchableOpacity accessibilityLabel="웹 안내 닫기" onPress={onDismiss}>
				<X size={14} color="#999" />
			</TouchableOpacity>
		</View>
	);
}
