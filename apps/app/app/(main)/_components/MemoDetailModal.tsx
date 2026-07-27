import {
	Check,
	FileText,
	Globe,
	HeartOff,
	Pencil,
	Save,
	Share2,
	Star,
	StarOff,
	X,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import {
	Dimensions,
	Image,
	Keyboard,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSettingQuery } from "@/lib/hooks/useSetting";
import { shareUrl } from "@/lib/sharing/shareUrl";
import { extractDomain } from "../_utils/extractDomain";
import { formatDate } from "../_utils/formatDate";
import type { MemoItem } from "./MemoCard";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

interface MemoDetailModalProps {
	memo: MemoItem | null;
	onClose: () => void;
	onNavigate: (url: string) => void;
	onWishRemove?: (memo: MemoItem) => void;
	onStarToggle?: (memo: MemoItem) => void;
	onSave?: (
		memo: MemoItem,
		next: {
			title: string;
			memo: string;
			impression: string;
			actionItem: string;
		},
	) => void;
}

export function MemoDetailModal({
	memo,
	onClose,
	onNavigate,
	onWishRemove,
	onStarToggle,
	onSave,
}: MemoDetailModalProps) {
	const insets = useSafeAreaInsets();
	const { isLoggedIn } = useAuth();
	const {
		showImpression: showImpressionSetting,
		showActionItem: showActionItemSetting,
	} = useSettingQuery(isLoggedIn);
	const showImpression = showImpressionSetting || !!memo?.impression;
	const showActionItem = showActionItemSetting || !!memo?.actionItem;
	const isDark = useColorScheme().colorScheme === "dark";
	const translateY = useSharedValue(SHEET_HEIGHT);
	const opacity = useSharedValue(0);
	const [modalVisible, setModalVisible] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editedTitle, setEditedTitle] = useState("");
	const [editedMemo, setEditedMemo] = useState("");
	const [editedImpression, setEditedImpression] = useState("");
	const [editedActionItem, setEditedActionItem] = useState("");
	const [saved, setSaved] = useState(false);

	const visible = memo !== null;

	useEffect(() => {
		if (visible) {
			setModalVisible(true);
			translateY.value = withTiming(0, { duration: 300 });
			opacity.value = withTiming(1, { duration: 300 });
		} else {
			translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
			opacity.value = withTiming(0, { duration: 250 });
			const timer = setTimeout(() => setModalVisible(false), 260);
			return () => clearTimeout(timer);
		}
	}, [visible, translateY, opacity]);

	useEffect(
		function syncEditState() {
			if (memo) {
				setEditedTitle(memo.title ?? "");
				setEditedMemo(memo.memo ?? "");
				setEditedImpression(memo.impression ?? "");
				setEditedActionItem(memo.actionItem ?? "");
				setIsEditing(false);
				setSaved(false);
			}
		},
		[memo],
	);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	const overlayStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	const handleNavigate = useCallback(() => {
		if (memo?.url && /^https?:\/\//.test(memo.url)) {
			onNavigate(memo.url);
		}
	}, [memo, onNavigate]);

	const handleWishRemove = useCallback(() => {
		if (memo && onWishRemove) {
			onWishRemove(memo);
		}
	}, [memo, onWishRemove]);

	const handleStarToggle = useCallback(() => {
		if (memo && onStarToggle) {
			onStarToggle(memo);
		}
	}, [memo, onStarToggle]);

	const handleShare = useCallback(() => {
		if (memo?.url) {
			shareUrl(memo.url, memo.title);
		}
	}, [memo]);

	const title = memo?.title || "Untitled";
	const memoText = memo?.memo ?? "";
	const impressionText = memo?.impression ?? "";
	const actionItemText = memo?.actionItem ?? "";

	const handleStartEdit = () => {
		setEditedTitle(title);
		setEditedMemo(memoText);
		setEditedImpression(impressionText);
		setEditedActionItem(actionItemText);
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		setEditedTitle(title);
		setEditedMemo(memoText);
		setEditedImpression(impressionText);
		setEditedActionItem(actionItemText);
		setIsEditing(false);
		Keyboard.dismiss();
	};

	const handleSaveMemo = () => {
		if (!memo) return;

		onSave?.(memo, {
			title: editedTitle.trim() || title,
			memo: editedMemo.trim(),
			impression: editedImpression.trim(),
			actionItem: editedActionItem.trim(),
		});
		setIsEditing(false);
		setSaved(true);
		Keyboard.dismiss();
		setTimeout(() => setSaved(false), 2000);
	};

	const isMemoEdited =
		(editedTitle.trim() !== "" && editedTitle.trim() !== title.trim()) ||
		editedMemo.trim() !== memoText.trim() ||
		editedImpression.trim() !== impressionText.trim() ||
		editedActionItem.trim() !== actionItemText.trim();

	const favIconUrl = memo && "favIconUrl" in memo ? memo.favIconUrl : undefined;
	const isWish = memo && "isWish" in memo ? memo.isWish : false;
	const isStar = memo && "isStar" in memo ? memo.isStar : false;
	const isWebUrl = !!memo?.url && /^https?:\/\//.test(memo.url);

	const domain = isWebUrl ? extractDomain(memo.url) : "";
	const rawDate = memo
		? "created_at" in memo
			? memo.created_at
			: memo.createdAt
		: undefined;
	const formattedDate = rawDate ? formatDate(String(rawDate)) : "";

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
						{ height: SHEET_HEIGHT, paddingBottom: insets.bottom + 16 },
					]}
				>
					<View className="items-center py-2.5">
						<View className="w-9 h-1 rounded-sm bg-gray-300 dark:bg-neutral-700" />
					</View>

					<View className="flex-row items-center justify-between px-5 pb-3 gap-2">
						{favIconUrl ? (
							<Image
								source={{ uri: favIconUrl }}
								style={{ width: 14, height: 14, borderRadius: 2 }}
							/>
						) : (
							<FileText size={14} color={isDark ? "#aaa" : "#666"} />
						)}
						{isEditing ? (
							<TextInput
								className="flex-1 p-0 text-base font-semibold text-foreground dark:text-white"
								value={editedTitle}
								onChangeText={setEditedTitle}
								placeholder="제목을 입력하세요"
								placeholderTextColor={isDark ? "#666" : "#999"}
							/>
						) : isWebUrl ? (
							<TouchableOpacity
								className="flex-1"
								onPress={handleNavigate}
								activeOpacity={0.7}
							>
								<Text
									className="text-base font-semibold text-foreground dark:text-white"
									numberOfLines={1}
								>
									{title}
								</Text>
							</TouchableOpacity>
						) : (
							<View className="flex-1">
								<Text
									className="text-base font-semibold text-foreground dark:text-white"
									numberOfLines={1}
								>
									{title}
								</Text>
							</View>
						)}
						{isEditing ? (
							<>
								<TouchableOpacity
									className="px-2 py-1"
									onPress={handleCancelEdit}
									activeOpacity={0.7}
								>
									<Text className="text-sm font-medium text-muted-foreground dark:text-neutral-400">
										취소
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg ${isMemoEdited ? "bg-foreground" : "bg-muted dark:bg-neutral-700"}`}
									onPress={handleSaveMemo}
									disabled={!isMemoEdited}
									activeOpacity={0.7}
								>
									<Save
										size={14}
										color={
											isMemoEdited
												? isDark
													? "#111"
													: "#fff"
												: isDark
													? "#666"
													: "#999"
										}
									/>
									<Text
										className={`text-sm font-semibold ${isMemoEdited ? "text-background" : "text-gray-400 dark:text-neutral-500"}`}
									>
										저장
									</Text>
								</TouchableOpacity>
							</>
						) : (
							<>
								{onSave ? (
									<TouchableOpacity
										onPress={handleStartEdit}
										activeOpacity={0.7}
									>
										{saved ? (
											<Check size={20} color="#22c55e" />
										) : (
											<Pencil size={18} color={isDark ? "#aaa" : "#666"} />
										)}
									</TouchableOpacity>
								) : null}
								{onStarToggle && (
									<TouchableOpacity
										onPress={handleStarToggle}
										activeOpacity={0.7}
									>
										{isStar ? (
											<StarOff size={20} color="#f59e0b" />
										) : (
											<Star size={20} color="#f59e0b" fill="#f59e0b" />
										)}
									</TouchableOpacity>
								)}
								{isWish && (
									<TouchableOpacity
										onPress={handleWishRemove}
										activeOpacity={0.7}
									>
										<HeartOff size={20} color="#ec4899" />
									</TouchableOpacity>
								)}
								{isWebUrl && (
									<TouchableOpacity onPress={handleShare} activeOpacity={0.7}>
										<Share2 size={20} color={isDark ? "#aaa" : "#666"} />
									</TouchableOpacity>
								)}
								<TouchableOpacity onPress={onClose} activeOpacity={0.7}>
									<X size={22} color={isDark ? "#aaa" : "#666"} />
								</TouchableOpacity>
							</>
						)}
					</View>

					{isEditing ? (
						<ScrollView
							className="flex-1 px-5"
							contentContainerStyle={{ paddingBottom: 12 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							<TextInput
								className="min-h-[80px] text-[15px] text-[#333] dark:text-white leading-[22px]"
								value={editedMemo}
								onChangeText={setEditedMemo}
								placeholder="메모를 입력하세요..."
								placeholderTextColor={isDark ? "#666" : "#999"}
								multiline
								textAlignVertical="top"
								scrollEnabled={false}
								autoFocus
							/>
							{showImpression && (
								<>
									<Text className="mt-3 text-xs font-semibold text-gray-500 dark:text-neutral-400">
										느낀 점
									</Text>
									<TextInput
										className="min-h-[48px] text-[15px] text-[#333] dark:text-white leading-[22px]"
										value={editedImpression}
										onChangeText={setEditedImpression}
										placeholder="이 페이지에서 느낀 점을 적어보세요"
										placeholderTextColor={isDark ? "#666" : "#999"}
										multiline
										textAlignVertical="top"
										scrollEnabled={false}
									/>
								</>
							)}
							{showActionItem && (
								<>
									<Text className="mt-3 text-xs font-semibold text-gray-500 dark:text-neutral-400">
										액션 아이템
									</Text>
									<TextInput
										className="min-h-[48px] text-[15px] text-[#333] dark:text-white leading-[22px]"
										value={editedActionItem}
										onChangeText={setEditedActionItem}
										placeholder="이 페이지를 보고 할 일을 적어보세요"
										placeholderTextColor={isDark ? "#666" : "#999"}
										multiline
										textAlignVertical="top"
										scrollEnabled={false}
									/>
								</>
							)}
						</ScrollView>
					) : (
						<ScrollView
							className="flex-1 px-5"
							contentContainerStyle={{ paddingBottom: 12 }}
							showsVerticalScrollIndicator={false}
						>
							{memoText ? (
								<Text className="text-[15px] text-[#333] dark:text-white leading-[22px]">
									{memoText}
								</Text>
							) : (
								<Text className="text-[15px] text-gray-400 dark:text-neutral-500 leading-[22px]">
									메모가 없습니다. 연필 아이콘을 눌러 작성하세요.
								</Text>
							)}
							{memo?.impression ? (
								<View className="mt-3">
									<Text className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mb-1">
										느낀 점
									</Text>
									<Text className="text-[15px] text-[#333] dark:text-white leading-[22px]">
										{memo.impression}
									</Text>
								</View>
							) : null}
							{memo?.actionItem ? (
								<View className="mt-3">
									<Text className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mb-1">
										액션 아이템
									</Text>
									<Text className="text-[15px] text-[#333] dark:text-white leading-[22px]">
										{memo.actionItem}
									</Text>
								</View>
							) : null}
						</ScrollView>
					)}

					{!isEditing && (
						<View className="flex-row items-center justify-between px-5 pt-2 pb-1">
							<View className="flex-row items-center gap-2">
								{domain ? (
									<View className="flex-row items-center gap-1">
										<Globe size={11} color={isDark ? "#777" : "#999"} />
										<Text className="text-xs text-muted-foreground dark:text-neutral-500">
											{domain}
										</Text>
									</View>
								) : null}
								{formattedDate ? (
									<Text className="text-xs text-muted-foreground dark:text-neutral-500">
										{formattedDate}
									</Text>
								) : null}
							</View>
						</View>
					)}
				</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	);
}
