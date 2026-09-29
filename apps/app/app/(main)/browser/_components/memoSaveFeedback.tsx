import { Text, TouchableOpacity, View } from "react-native";

/** 실패한 단계의 재시도만 표시하고 정상 자동 저장은 조용히 처리한다. */
export function MemoSaveFeedback({
	isCleanupError,
	isPending,
	onRetry,
}: {
	isCleanupError: boolean;
	isPending: boolean;
	onRetry: () => void;
}) {
	return (
		<View className="mb-2 flex-row items-center gap-2">
			<Text
				className={`flex-1 text-xs ${isCleanupError ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}
				accessibilityRole="alert"
				accessibilityLiveRegion="polite"
			>
				{isCleanupError
					? "메모는 저장됐어요. 이전 초안 정리가 필요해요."
					: "저장하지 못했어요. 작성한 내용은 유지돼요."}
			</Text>
			<TouchableOpacity
				accessibilityRole="button"
				disabled={isPending}
				onPress={onRetry}
				className={`px-2 py-2 ${isPending ? "opacity-50" : ""}`}
			>
				<Text className="text-sm text-blue-500">
					{isCleanupError ? "정리 재시도" : "다시 시도"}
				</Text>
			</TouchableOpacity>
		</View>
	);
}
