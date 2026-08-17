import { Check, ChevronDown, FileText, Save, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/lib/auth/AuthProvider";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";
import {
	useLocalMemoByUrl,
	useLocalMemoUpsert,
} from "@/lib/hooks/useLocalMemos";
import { useSupabaseMemoByUrl } from "@/lib/hooks/useMemoByUrl";
import { useMemoUpsertMutation } from "@/lib/hooks/useMemoMutation";
import { useSettingQuery } from "@/lib/hooks/useSetting";

interface MemoPanelProps {
	url: string;
	pageTitle: string;
	favIconUrl?: string;
	onClose?: () => void;
}

export function MemoPanel({
	url,
	pageTitle,
	favIconUrl,
	onClose,
}: MemoPanelProps) {
	const { isLoggedIn } = useAuth();
	const isDark = useColorScheme() === "dark";

	const [titleText, setTitleText] = useState("");
	const [memoText, setMemoText] = useState("");
	const [impressionText, setImpressionText] = useState("");
	const [actionItemText, setActionItemText] = useState("");
	const [saved, setSaved] = useState(false);

	const { isKeyboardVisible } = useKeyboardHeight();
	const { showImpression, showActionItem } = useSettingQuery(isLoggedIn);

	const { data: localMemo } = useLocalMemoByUrl(url);
	const { data: supabaseMemo } = useSupabaseMemoByUrl(url, isLoggedIn);
	const existingMemo = isLoggedIn
		? supabaseMemo
			? {
					title: supabaseMemo.title,
					memo: supabaseMemo.memo,
					impression: supabaseMemo.impression ?? "",
					actionItem: supabaseMemo.actionItem ?? "",
				}
			: null
		: localMemo;

	const localUpsert = useLocalMemoUpsert();
	const supabaseUpsert = useMemoUpsertMutation();
	const isPending = isLoggedIn
		? supabaseUpsert.isPending
		: localUpsert.isPending;

	const justSavedRef = useRef(false);
	const prevUrlRef = useRef(url);

	useEffect(() => {
		if (prevUrlRef.current !== url) {
			prevUrlRef.current = url;
			setSaved(false);
			justSavedRef.current = false;
		}

		setTitleText(existingMemo?.title ?? pageTitle ?? "");
		if (existingMemo?.memo) {
			setMemoText(existingMemo.memo);
		} else {
			setMemoText("");
		}
		setImpressionText(existingMemo?.impression ?? "");
		setActionItemText(existingMemo?.actionItem ?? "");
		if (!justSavedRef.current) {
			setSaved(false);
		}
	}, [
		existingMemo?.title,
		existingMemo?.memo,
		existingMemo?.impression,
		existingMemo?.actionItem,
		pageTitle,
		url,
	]);

	// 설정을 꺼도 이미 작성된 내용이 있으면 유실로 오해하지 않도록 계속 노출한다.
	const isImpressionSectionVisible =
		showImpression || !!existingMemo?.impression;
	const isActionItemSectionVisible =
		showActionItem || !!existingMemo?.actionItem;

	const onSaveSuccess = () => {
		justSavedRef.current = true;
		setSaved(true);
		setTimeout(() => {
			setSaved(false);
			justSavedRef.current = false;
		}, 2000);
	};

	const handleSave = () => {
		if (!memoText.trim() && !impressionText.trim() && !actionItemText.trim())
			return;

		if (isLoggedIn) {
			const payload = {
				url,
				title: titleText.trim() || pageTitle || url,
				memo: memoText.trim(),
				impression: impressionText.trim(),
				actionItem: actionItemText.trim(),
				favIconUrl: favIconUrl ?? null,
			};
			supabaseUpsert.mutate(payload, { onSuccess: onSaveSuccess });
		} else {
			const payload = {
				url,
				title: titleText.trim() || pageTitle || url,
				memo: memoText.trim(),
				impression: impressionText.trim(),
				actionItem: actionItemText.trim(),
				favIconUrl,
			};
			localUpsert.mutate(payload, { onSuccess: onSaveSuccess });
		}
	};

	return (
		<View className="flex-1 bg-white dark:bg-neutral-900 p-3">
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
						onChangeText={setTitleText}
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
							{saved ? "저장됨" : "저장"}
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
					onChangeText={setMemoText}
					multiline
					scrollEnabled={false}
					textAlignVertical="top"
				/>

				{isImpressionSectionVisible && (
					<>
						<Text className="mt-3 text-xs font-semibold text-gray-500 dark:text-neutral-400">
							느낀 점
						</Text>
						<TextInput
							className="min-h-[60px] text-[15px] text-[#333] dark:text-white leading-[22px]"
							placeholder="이 페이지에서 느낀 점을 적어보세요"
							placeholderTextColor={isDark ? "#666" : "#999"}
							value={impressionText}
							onChangeText={setImpressionText}
							multiline
							scrollEnabled={false}
							textAlignVertical="top"
						/>
					</>
				)}

				{isActionItemSectionVisible && (
					<>
						<Text className="mt-3 text-xs font-semibold text-gray-500 dark:text-neutral-400">
							액션 아이템
						</Text>
						<TextInput
							className="min-h-[60px] text-[15px] text-[#333] dark:text-white leading-[22px]"
							placeholder="이 페이지를 보고 할 일을 적어보세요"
							placeholderTextColor={isDark ? "#666" : "#999"}
							value={actionItemText}
							onChangeText={setActionItemText}
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
