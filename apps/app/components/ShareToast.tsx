import { Check } from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** 공유 처리 결과를 알려 주는 화면 상단 토스트. */
export function ShareToast({ message }: { message: string }) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="absolute self-center flex-row items-center gap-2 bg-black/80 px-4 py-2.5 rounded-[20px]"
			style={{ top: insets.top + 60 }}
		>
			<Check size={14} color="#22c55e" />
			<Text className="text-white text-sm font-semibold">{message}</Text>
		</View>
	);
}
