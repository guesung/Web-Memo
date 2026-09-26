import { Check, ChevronDown, FileText, Save, X } from "lucide-react-native";
import {
	ActivityIndicator,
	Image,
	Keyboard,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";
import {
	type IFMemoPanelProps,
	useMemoPanelState,
} from "../_hooks/useMemoPanelState";
import { MemoCandidateChooser } from "./MemoCandidateChooser";

/** 현재 페이지의 메모 후보와 편집기를 표시한다. */
export function MemoPanel(props: IFMemoPanelProps) {
	const isDark = useColorScheme() === "dark";
	const { selectedMemoId, favIconUrl, onClose } = props;
	const {
		pendingLocalMemos,
		hasPendingShare,
		candidates,
		isPending,
		handleSelectionChange,
		selectedMemo,
		handlePendingLocalSelect,
		pendingLocalId,
		pendingSaveMode,
		setPendingSaveMode,
		handlePendingShareApply,
		isPendingShareApply,
		hasDraftRef,
		titleText,
		markDraftChanged,
		setTitleText,
		isKeyboardVisible,
		saved,
		handleSave,
		showImpression,
		showActionItem,
		memoText,
		setMemoText,
		impressionText,
		setImpressionText,
		actionItemText,
		setActionItemText,
		isLoadingMemo,
		memoError,
		isChoosingMemo,
	} = useMemoPanelState(props);

	if (isLoadingMemo) {
		return <ActivityIndicator className="flex-1" />;
	}
	if (memoError) {
		return <Text className="p-4 text-red-500">메모를 불러오지 못했어요.</Text>;
	}
	if (isChoosingMemo) {
		return (
			<MemoCandidateChooser
				selectedMemoId={selectedMemoId}
				pendingLocalCount={pendingLocalMemos.length}
				hasPendingShare={hasPendingShare}
				candidates={candidates}
				isPending={isPending}
				onSelectionChange={handleSelectionChange}
			/>
		);
	}

	return (
		<View className="flex-1 bg-white dark:bg-neutral-900 p-3">
			{pendingLocalMemos.length > 0 && (
				<View className="mb-2">
					<Text className="text-amber-600">
						동기화 대기 초안을 선택해 내용을 확인하세요.
					</Text>
					{pendingLocalMemos.map((candidate) => (
						<TouchableOpacity
							key={candidate.id}
							accessibilityRole="button"
							onPress={() => handlePendingLocalSelect(candidate)}
							disabled={isPending}
						>
							<Text className="text-blue-500 py-1">
								초안 불러오기: {candidate.title}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			)}
			{pendingLocalId && (
				<View className="mb-2">
					<Text className="text-amber-600">
						초안을 어떻게 저장할지 선택하세요.
					</Text>
					{typeof selectedMemo?.id === "number" && (
						<TouchableOpacity
							accessibilityRole="button"
							disabled={isPending}
							onPress={() => setPendingSaveMode("existing")}
						>
							<Text className="text-blue-500 py-1">
								{pendingSaveMode === "existing" ? "✓ " : ""}선택한 기존 메모
								수정
							</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity
						accessibilityRole="button"
						disabled={isPending}
						onPress={() => setPendingSaveMode("separate")}
					>
						<Text className="text-blue-500 py-1">
							{pendingSaveMode === "separate" ? "✓ " : ""}별도 메모로 저장
						</Text>
					</TouchableOpacity>
				</View>
			)}
			{hasPendingShare && (
				<TouchableOpacity
					accessibilityRole="button"
					onPress={handlePendingShareApply}
					disabled={isPendingShareApply}
				>
					<Text className="text-blue-500 mb-2">
						보류된 공유 요청을 위시리스트에 추가
					</Text>
				</TouchableOpacity>
			)}
			{candidates.length > 1 && (
				<TouchableOpacity
					accessibilityRole="button"
					onPress={() => handleSelectionChange(null)}
					disabled={isPending}
				>
					<Text className="text-blue-500 mb-2">다른 메모 선택</Text>
				</TouchableOpacity>
			)}
			{hasDraftRef.current && selectedMemo && (
				<Text className="text-amber-600 mb-2">
					작성 중인 내용을 유지했습니다. 저장하면 선택한 메모에 반영됩니다.
				</Text>
			)}
			<View className="flex-row justify-between items-center mb-2">
				<View className="flex-row items-center gap-1.5 flex-1 mr-2">
					{favIconUrl ? (
						<Image
							source={{ uri: favIconUrl }}
							style={{ width: 14, height: 14, borderRadius: 2 }}
						/>
					) : (
						<FileText size={14} color={isDark ? "#aaa" : "#666"} />
					)}
					<TextInput
						className="flex-1 text-base font-semibold text-foreground dark:text-white p-0"
						value={titleText}
						onChangeText={(value) => {
							markDraftChanged("title", value);
							setTitleText(value);
						}}
						placeholder="제목"
						placeholderTextColor={isDark ? "#666" : "#999"}
						numberOfLines={1}
					/>
				</View>
				<View className="flex-row items-center gap-2">
					{isKeyboardVisible && (
						<TouchableOpacity
							className="items-center justify-center bg-muted dark:bg-neutral-700 px-2.5 py-2 rounded-lg"
							onPress={() => Keyboard.dismiss()}
						>
							<ChevronDown size={16} color={isDark ? "#aaa" : "#666"} />
						</TouchableOpacity>
					)}
					{onClose && (
						<TouchableOpacity
							className="items-center justify-center p-1.5"
							onPress={onClose}
						>
							<X size={16} color={isDark ? "#777" : "#999"} />
						</TouchableOpacity>
					)}
					<TouchableOpacity
						className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-lg ${saved ? "bg-success" : "bg-foreground"}`}
						onPress={handleSave}
						disabled={
							isPending ||
							(pendingLocalId !== null && pendingSaveMode === null) ||
							(!memoText.trim() &&
								!impressionText.trim() &&
								!actionItemText.trim())
						}
					>
						{isPending ? (
							<ActivityIndicator size="small" color="#fff" />
						) : saved ? (
							<Check size={16} color="#fff" />
						) : (
							<Save size={16} color="#fff" />
						)}
						<Text className="text-white text-sm font-semibold">
							{saved
								? "저장됨"
								: pendingSaveMode === "separate"
									? "별도 저장"
									: "저장"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView
				className="flex-1"
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="interactive"
				contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
				showsVerticalScrollIndicator={false}
			>
				<TextInput
					className="min-h-[140px] text-[15px] text-[#333] dark:text-white leading-[22px]"
					placeholder="이 페이지에 대한 메모를 작성하세요..."
					placeholderTextColor={isDark ? "#666" : "#999"}
					value={memoText}
					onChangeText={(value) => {
						markDraftChanged("memo", value);
						setMemoText(value);
					}}
					multiline
					scrollEnabled={false}
					textAlignVertical="top"
				/>

				{showImpression && (
					<>
						<Text className="mt-3 text-xs font-semibold text-gray-500 dark:text-neutral-400">
							느낀 점
						</Text>
						<TextInput
							className="min-h-[60px] text-[15px] text-[#333] dark:text-white leading-[22px]"
							placeholder="이 페이지에서 느낀 점을 적어보세요"
							placeholderTextColor={isDark ? "#666" : "#999"}
							value={impressionText}
							onChangeText={(value) => {
								markDraftChanged("impression", value);
								setImpressionText(value);
							}}
							multiline
							scrollEnabled={false}
							textAlignVertical="top"
						/>
					</>
				)}

				{showActionItem && (
					<>
						<Text className="mt-3 text-xs font-semibold text-gray-500 dark:text-neutral-400">
							액션 아이템
						</Text>
						<TextInput
							className="min-h-[60px] text-[15px] text-[#333] dark:text-white leading-[22px]"
							placeholder="이 페이지를 보고 할 일을 적어보세요"
							placeholderTextColor={isDark ? "#666" : "#999"}
							value={actionItemText}
							onChangeText={(value) => {
								markDraftChanged("actionItem", value);
								setActionItemText(value);
							}}
							multiline
							scrollEnabled={false}
							textAlignVertical="top"
						/>
					</>
				)}
			</ScrollView>
		</View>
	);
}
