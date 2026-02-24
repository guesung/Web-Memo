import { useAuth } from "@/lib/auth/AuthProvider";
import {
	useLocalMemoByUrl,
	useLocalMemoUpsert,
} from "@/lib/hooks/useLocalMemos";
import { useSupabaseMemoByUrl } from "@/lib/hooks/useMemoByUrl";
import { useMemoUpsertMutation } from "@/lib/hooks/useMemoMutation";
import { Check, ChevronDown, FileText, Save, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Keyboard,
	Platform,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

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

	const [memoText, setMemoText] = useState("");
	const [saved, setSaved] = useState(false);
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

	const { data: localMemo } = useLocalMemoByUrl(url);
	const { data: supabaseMemo } = useSupabaseMemoByUrl(url, isLoggedIn);
	const existingMemo = isLoggedIn
		? supabaseMemo
			? { memo: supabaseMemo.memo }
			: null
		: localMemo;

	const { mutate: localMutate, isPending: isLocalPending } =
		useLocalMemoUpsert();
	const { mutate: supabaseMutate, isPending: isSupabasePending } =
		useMemoUpsertMutation();
	const isPending = isLoggedIn ? isSupabasePending : isLocalPending;

	useEffect(() => {
		const showEvent =
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
		const hideEvent =
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

		const showSub = Keyboard.addListener(showEvent, () =>
			setIsKeyboardVisible(true),
		);
		const hideSub = Keyboard.addListener(hideEvent, () =>
			setIsKeyboardVisible(false),
		);

		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	useEffect(() => {
		if (existingMemo?.memo) {
			setMemoText(existingMemo.memo);
		} else {
			setMemoText("");
		}
		setSaved(false);
	}, [existingMemo?.memo]);

	const onSaveSuccess = () => {
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	const handleSave = () => {
		if (!memoText.trim()) return;

		if (isLoggedIn) {
			const payload = {
				url,
				title: pageTitle || url,
				memo: memoText.trim(),
				favIconUrl: favIconUrl ?? null,
			};
			supabaseMutate(payload, { onSuccess: onSaveSuccess });
		} else {
			const payload = {
				url,
				title: pageTitle || url,
				memo: memoText.trim(),
				favIconUrl,
			};
			localMutate(payload, { onSuccess: onSaveSuccess });
		}
	};

	return (
		<View className="flex-1 bg-white p-3">
			<View className="flex-row justify-between items-center mb-2">
				<View className="flex-row items-center gap-1.5 flex-1 mr-2">
					{favIconUrl ? (
						<Image
							source={{ uri: favIconUrl }}
							style={{ width: 14, height: 14, borderRadius: 2 }}
						/>
					) : (
						<FileText size={14} color="#666" />
					)}
					<Text
						className="text-base font-semibold text-foreground flex-1"
						numberOfLines={1}
					>
						{pageTitle || "메모"}
					</Text>
				</View>
				<View className="flex-row items-center gap-2">
					{isKeyboardVisible && (
						<TouchableOpacity
							className="items-center justify-center bg-muted px-2.5 py-2 rounded-lg"
							onPress={() => Keyboard.dismiss()}
						>
							<ChevronDown size={16} color="#666" />
						</TouchableOpacity>
					)}
					{onClose && (
						<TouchableOpacity
							className="items-center justify-center p-1.5"
							onPress={onClose}
						>
							<X size={16} color="#999" />
						</TouchableOpacity>
					)}
					<TouchableOpacity
						className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-lg ${saved ? "bg-success" : "bg-foreground"}`}
						onPress={handleSave}
						disabled={isPending || !memoText.trim()}
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

			<TextInput
				className="flex-1 text-[15px] text-[#333] leading-[22px]"
				placeholder="이 페이지에 대한 메모를 작성하세요..."
				value={memoText}
				onChangeText={setMemoText}
				multiline
				textAlignVertical="top"
			/>
		</View>
	);
}
