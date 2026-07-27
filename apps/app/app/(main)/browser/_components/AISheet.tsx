import { Send, Sparkles, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SHEET_ANIMATION_DISTANCE = 600;

interface AISheetProps {
	visible: boolean;
	onClose: () => void;
	summary: string | null;
	answer: string | null;
	question: string;
	onQuestionChange: (text: string) => void;
	onAskQuestion: () => void;
	isLoading: boolean;
	error: string | null;
}

/** 현재 보고 있는 페이지 본문을 요약하고, 이어서 질문할 수 있는 시트 */
export function AISheet({
	visible,
	onClose,
	summary,
	answer,
	question,
	onQuestionChange,
	onAskQuestion,
	isLoading,
	error,
}: AISheetProps) {
	const insets = useSafeAreaInsets();
	const isDark = useColorScheme() === "dark";
	const translateY = useSharedValue(SHEET_ANIMATION_DISTANCE);
	const opacity = useSharedValue(0);
	const [modalVisible, setModalVisible] = useState(false);

	useEffect(() => {
		if (visible) {
			setModalVisible(true);
			translateY.value = withTiming(0, { duration: 280 });
			opacity.value = withTiming(1, { duration: 280 });
		} else {
			translateY.value = withTiming(SHEET_ANIMATION_DISTANCE, {
				duration: 220,
			});
			opacity.value = withTiming(0, { duration: 220 });
			const timer = setTimeout(() => setModalVisible(false), 230);
			return () => clearTimeout(timer);
		}
	}, [visible, translateY, opacity]);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	const overlayStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	return (
		<Modal visible={modalVisible} transparent statusBarTranslucent>
			<KeyboardAvoidingView
				className="flex-1 justify-end"
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<Animated.View
					className="absolute inset-0 bg-black/40"
					style={overlayStyle}
				>
					<Pressable className="absolute inset-0" onPress={onClose} />
				</Animated.View>

				<Animated.View
					className="bg-white dark:bg-neutral-900 rounded-t-[20px]"
					style={[
						sheetStyle,
						{ height: "75%", paddingBottom: insets.bottom + 12 },
					]}
				>
					<View className="items-center py-2.5">
						<View className="w-9 h-1 rounded-sm bg-gray-300 dark:bg-neutral-700" />
					</View>

					<View className="flex-row justify-between items-center px-5 pb-3">
						<View className="flex-row items-center gap-1.5">
							<Sparkles size={18} color="#7c3aed" />
							<Text className="text-lg font-bold text-foreground dark:text-white">
								AI 요약/질문
							</Text>
						</View>
						<TouchableOpacity onPress={onClose} activeOpacity={0.7}>
							<X size={22} color={isDark ? "#aaa" : "#666"} />
						</TouchableOpacity>
					</View>

					<ScrollView
						className="flex-1 px-5"
						contentContainerStyle={{ paddingBottom: 16 }}
						showsVerticalScrollIndicator={false}
					>
						{isLoading && !summary && !answer ? (
							<View className="items-center py-10 gap-2">
								<ActivityIndicator size="small" color="#7c3aed" />
								<Text className="text-sm text-muted-foreground dark:text-neutral-500">
									페이지를 읽고 요약하는 중이에요...
								</Text>
							</View>
						) : error ? (
							<Text className="text-sm text-destructive">{error}</Text>
						) : (
							<>
								{summary ? (
									<View className="mb-4">
										<Text className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mb-1.5">
											요약
										</Text>
										<Text className="text-[15px] text-[#333] dark:text-white leading-[22px]">
											{summary}
										</Text>
									</View>
								) : null}

								{question ? (
									<View className="mb-2">
										<Text className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mb-1.5">
											질문
										</Text>
										<Text className="text-[15px] text-[#333] dark:text-white leading-[22px]">
											{question}
										</Text>
									</View>
								) : null}

								{isLoading && summary ? (
									<ActivityIndicator
										size="small"
										color="#7c3aed"
										style={{ marginTop: 8 }}
									/>
								) : answer ? (
									<View className="mt-1">
										<Text className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mb-1.5">
											답변
										</Text>
										<Text className="text-[15px] text-[#333] dark:text-white leading-[22px]">
											{answer}
										</Text>
									</View>
								) : null}
							</>
						)}
					</ScrollView>

					<View className="flex-row items-center gap-2 px-5 pt-2">
						<TextInput
							className="flex-1 bg-input dark:bg-neutral-800 rounded-[10px] px-3 py-2.5 text-sm text-[#333] dark:text-white"
							value={question}
							onChangeText={onQuestionChange}
							placeholder="이 페이지에 대해 질문해보세요"
							placeholderTextColor={isDark ? "#666" : "#999"}
							returnKeyType="send"
							onSubmitEditing={onAskQuestion}
							editable={!isLoading}
						/>
						<TouchableOpacity
							className="bg-foreground p-2.5 rounded-[10px]"
							onPress={onAskQuestion}
							disabled={isLoading || !question.trim()}
						>
							<Send size={16} color={isDark ? "#111" : "#fff"} />
						</TouchableOpacity>
					</View>
				</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	);
}
