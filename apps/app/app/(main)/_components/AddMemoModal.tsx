import { Link2, Save, Type, X } from "lucide-react-native";
import { useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocalMemoUpsert } from "@/lib/hooks/useLocalMemos";
import { useMemoUpsertMutation } from "@/lib/hooks/useMemoMutation";
import {
	extractPageMetadata,
	getFavIconUrl,
	normalizeInputUrl,
} from "@/lib/sharing/pageMetadata";

interface AddMemoModalProps {
	visible: boolean;
	onClose: () => void;
}

/**
 * URL 없이도 메모를 작성할 수 있는 메모 추가 모달.
 * @description 제목·URL은 모두 선택 입력이다. URL을 입력하면 제목·favIcon을 자동 추출하고,
 * URL이 없으면 고유 식별자를 부여해 일반 메모로 저장한다.
 */
export function AddMemoModal({ visible, onClose }: AddMemoModalProps) {
	const insets = useSafeAreaInsets();
	const { isLoggedIn } = useAuth();

	const [titleText, setTitleText] = useState("");
	const [urlText, setUrlText] = useState("");
	const [memoText, setMemoText] = useState("");
	const [impressionText, setImpressionText] = useState("");
	const [actionItemText, setActionItemText] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const localUpsert = useLocalMemoUpsert();
	const supabaseUpsert = useMemoUpsertMutation();

	const resetState = () => {
		setTitleText("");
		setUrlText("");
		setMemoText("");
		setImpressionText("");
		setActionItemText("");
		setIsSaving(false);
	};

	const handleClose = () => {
		resetState();
		onClose();
	};

	const hasContent =
		!!titleText.trim() ||
		!!memoText.trim() ||
		!!impressionText.trim() ||
		!!actionItemText.trim();

	const handleSave = async () => {
		if (!hasContent || isSaving) {
			return;
		}

		setIsSaving(true);

		const normalizedUrl = normalizeInputUrl(urlText);
		let title = titleText.trim();
		let favIconUrl: string | null = null;

		if (normalizedUrl) {
			favIconUrl = getFavIconUrl(normalizedUrl);
			if (!title) {
				const metadata = await extractPageMetadata(normalizedUrl);
				title = metadata.title;
			}
		}
		if (!title) {
			title = "무제목";
		}

		const finalUrl =
			normalizedUrl ??
			`memo://local/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		const payload = {
			url: finalUrl,
			title,
			memo: memoText.trim(),
			impression: impressionText.trim(),
			actionItem: actionItemText.trim(),
		};

		const mutationOptions = {
			onSuccess: handleClose,
			onError: () => setIsSaving(false),
		};

		if (isLoggedIn) {
			supabaseUpsert.mutate({ ...payload, favIconUrl }, mutationOptions);
		} else {
			localUpsert.mutate(
				{ ...payload, favIconUrl: favIconUrl ?? undefined },
				mutationOptions,
			);
		}
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			statusBarTranslucent
			onRequestClose={handleClose}
		>
			<KeyboardAvoidingView
				className="flex-1 justify-end"
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<View
					className="bg-white rounded-t-[20px] overflow-hidden"
					style={{ height: "85%", paddingBottom: insets.bottom }}
				>
					<View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-border">
						<Text className="text-base font-semibold text-foreground">
							메모 추가
						</Text>
						<View className="flex-row items-center gap-2">
							<TouchableOpacity
								className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-lg ${hasContent ? "bg-foreground" : "bg-muted"}`}
								onPress={handleSave}
								disabled={!hasContent || isSaving}
								activeOpacity={0.8}
							>
								{isSaving ? (
									<ActivityIndicator size="small" color="#fff" />
								) : (
									<Save size={16} color={hasContent ? "#fff" : "#999"} />
								)}
								<Text
									className={`text-sm font-semibold ${hasContent ? "text-white" : "text-gray-400"}`}
								>
									저장
								</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
								<X size={22} color="#666" />
							</TouchableOpacity>
						</View>
					</View>

					<ScrollView
						className="flex-1 px-5"
						keyboardShouldPersistTaps="handled"
						keyboardDismissMode="interactive"
						contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
						showsVerticalScrollIndicator={false}
					>
						<View className="flex-row items-center bg-input rounded-[10px] px-3 py-2.5 gap-2">
							<Type size={16} color="#999" />
							<TextInput
								className="flex-1 text-sm text-[#333] p-0"
								value={titleText}
								onChangeText={setTitleText}
								placeholder="제목 (선택)"
								returnKeyType="next"
							/>
						</View>

						<View className="flex-row items-center bg-input rounded-[10px] px-3 py-2.5 gap-2 mt-2">
							<Link2 size={16} color="#999" />
							<TextInput
								className="flex-1 text-sm text-[#333] p-0"
								value={urlText}
								onChangeText={setUrlText}
								placeholder="URL (선택)"
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="url"
								returnKeyType="next"
							/>
						</View>
						<Text className="mt-1.5 text-xs text-gray-400">
							URL을 입력하면 제목과 아이콘을 자동으로 가져옵니다
						</Text>

						<TextInput
							className="min-h-[140px] mt-4 text-[15px] text-[#333] leading-[22px]"
							placeholder="메모를 작성하세요..."
							value={memoText}
							onChangeText={setMemoText}
							multiline
							scrollEnabled={false}
							textAlignVertical="top"
						/>

						<Text className="mt-3 text-xs font-semibold text-gray-500">
							느낀 점
						</Text>
						<TextInput
							className="min-h-[60px] text-[15px] text-[#333] leading-[22px]"
							placeholder="느낀 점을 적어보세요"
							value={impressionText}
							onChangeText={setImpressionText}
							multiline
							scrollEnabled={false}
							textAlignVertical="top"
						/>

						<Text className="mt-3 text-xs font-semibold text-gray-500">
							액션 아이템
						</Text>
						<TextInput
							className="min-h-[60px] text-[15px] text-[#333] leading-[22px]"
							placeholder="할 일을 적어보세요"
							value={actionItemText}
							onChangeText={setActionItemText}
							multiline
							scrollEnabled={false}
							textAlignVertical="top"
						/>
					</ScrollView>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}
