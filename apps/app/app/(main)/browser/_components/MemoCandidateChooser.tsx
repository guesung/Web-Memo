import { ScrollView, Text, TouchableOpacity } from "react-native";
import type { useMemoPanelCandidates } from "../_hooks/useMemoPanelCandidates";

/** 같은 페이지의 메모 후보를 선택하는 화면이다. */
export function MemoCandidateChooser({
	selectedMemoId,
	pendingLocalCount,
	hasPendingShare,
	candidates,
	isPending,
	onSelectionChange,
}: {
	selectedMemoId: number | string | null;
	pendingLocalCount: number;
	hasPendingShare: boolean;
	candidates: ReturnType<typeof useMemoPanelCandidates>["candidates"];
	isPending: boolean;
	onSelectionChange: (id: number | string | null) => void;
}) {
	return (
		<ScrollView className="flex-1 bg-white dark:bg-neutral-900 p-3">
			<Text className="text-base font-semibold text-foreground dark:text-white mb-3">
				{selectedMemoId !== null
					? "선택한 메모를 다시 확인해 주세요"
					: "편집할 메모를 선택하세요"}
			</Text>
			{(pendingLocalCount > 0 || hasPendingShare) && (
				<Text className="text-amber-600 mb-3">
					보류된 초안 또는 공유 요청이 있습니다. 대상을 고르면 내용을 확인할 수
					있습니다.
				</Text>
			)}
			{candidates.map((candidate) => (
				<TouchableOpacity
					key={candidate.id}
					accessibilityRole="button"
					onPress={() => onSelectionChange(candidate.id)}
					disabled={isPending}
					className="p-3 mb-2 rounded-lg border border-border dark:border-neutral-700"
				>
					<Text className="font-semibold text-foreground dark:text-white">
						{candidate.title}
					</Text>
					<Text
						numberOfLines={2}
						className="text-gray-500 dark:text-neutral-400"
					>
						{candidate.memo}
					</Text>
					<Text className="text-xs text-gray-400">
						{("updatedAt" in candidate
							? candidate.updatedAt
							: candidate.updated_at) ?? ""}
					</Text>
				</TouchableOpacity>
			))}
			{candidates.length === 0 && selectedMemoId !== null && (
				<TouchableOpacity
					accessibilityRole="button"
					onPress={() => onSelectionChange(null)}
					disabled={isPending}
				>
					<Text className="text-blue-500">새 메모 작성</Text>
				</TouchableOpacity>
			)}
		</ScrollView>
	);
}
