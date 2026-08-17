import {
	HIGHLIGHT_COLOR_STYLE,
	HIGHLIGHT_COLORS,
	type HighlightColor,
} from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Alert,
	Dimensions,
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

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;

/** 하이라이트 수정 요청. 색상 또는 코멘트 중 바뀐 값만 채워 보낸다. */
interface HighlightUpdateRequest {
	id: number;
	url: string;
	color?: HighlightColor;
	note?: string;
}

/** 하이라이트 삭제 요청. */
interface HighlightDeleteRequest {
	id: number;
	url: string;
}

/** {@link HighlightEditSheet} props. */
interface HighlightEditSheetProps {
	highlight: HighlightRow | null;
	onClose: () => void;
	onUpdate: (request: HighlightUpdateRequest) => void;
	onDelete: (request: HighlightDeleteRequest) => void;
}

/**
 * 인앱 브라우저에서 밑줄 그은 하이라이트를 탭했을 때 뜨는 편집 바텀시트.
 * @description 색 변경·코멘트 작성·삭제를 제공한다. `MemoDetailModal`과 같은
 * Modal + reanimated 슬라이드 패턴을 따른다.
 */
export function HighlightEditSheet({
	highlight,
	onClose,
	onUpdate,
	onDelete,
}: HighlightEditSheetProps) {
	const insets = useSafeAreaInsets();
	const isDark = useColorScheme() === "dark";
	const translateY = useSharedValue(SHEET_HEIGHT);
	const opacity = useSharedValue(0);
	const [modalVisible, setModalVisible] = useState(false);
	const [note, setNote] = useState("");
	/** 마지막으로 note를 동기화한 하이라이트 id. 같은 하이라이트의 refetch로 인한 리렌더에서 입력 중인 note를 덮어쓰지 않기 위해 둔다. */
	const syncedHighlightIdRef = useRef<number | null>(null);
	/**
	 * 마지막으로 저장 요청을 보낸 note 값.
	 * @description `flushNote`의 변경 여부 판단 기준을 `highlight.note`(서버 refetch가
	 * 끝나야 갱신되는 stale 값)가 아니라 이 값으로 삼는다. 배경 터치로 시트를 닫으면
	 * `TextInput`의 `onBlur`(flushNote)와 배경 `Pressable`의 `onClose`(flushNote)가
	 * 연달아 발화하는데, 첫 호출 시점에 이 ref를 즉시 갱신해두면 두 번째 호출은
	 * "이미 보낸 값과 같다"고 판단해 중복 저장 요청을 만들지 않는다.
	 */
	const lastFlushedNoteRef = useRef<string | null>(null);

	const visible = highlight !== null;

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

	/**
	 * 다른 하이라이트를 연속으로 탭했을 때만 note를 다시 채운다.
	 * @description `highlight`는 조회 쿼리가 refetch될 때마다 같은 id라도 새 객체로
	 * 바뀐다. 의존성을 `highlight` 객체 전체로 두면 사용자가 입력 중인 note가
	 * refetch 시점에 서버 값으로 덮어써질 수 있어, id 변화 여부로만 동기화 시점을 판단한다.
	 */
	useEffect(() => {
		if (!highlight) {
			syncedHighlightIdRef.current = null;
			lastFlushedNoteRef.current = null;
			return;
		}

		if (syncedHighlightIdRef.current === highlight.id) {
			return;
		}

		syncedHighlightIdRef.current = highlight.id;
		lastFlushedNoteRef.current = highlight.note ?? "";
		setNote(highlight.note ?? "");
	}, [highlight]);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	const overlayStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	const flushNote = useCallback(() => {
		if (!highlight) {
			return;
		}

		if (note === lastFlushedNoteRef.current) {
			return;
		}

		lastFlushedNoteRef.current = note;
		onUpdate({ id: highlight.id, url: highlight.url, note });
	}, [highlight, note, onUpdate]);

	const handleClose = useCallback(() => {
		flushNote();
		onClose();
	}, [flushNote, onClose]);

	const handleColorPress = useCallback(
		(color: HighlightColor) => {
			if (!highlight) {
				return;
			}

			onUpdate({ id: highlight.id, url: highlight.url, color });
		},
		[highlight, onUpdate],
	);

	const handleDeletePress = useCallback(() => {
		if (!highlight) {
			return;
		}

		const { id, url } = highlight;

		Alert.alert("하이라이트 삭제", "이 하이라이트를 삭제하시겠습니까?", [
			{ text: "취소", style: "cancel" },
			{
				text: "삭제",
				style: "destructive",
				onPress: () => {
					onDelete({ id, url });
					onClose();
				},
			},
		]);
	}, [highlight, onDelete, onClose]);

	return (
		<Modal
			visible={modalVisible}
			transparent
			statusBarTranslucent
			onRequestClose={handleClose}
		>
			<KeyboardAvoidingView
				className="flex-1 justify-end"
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<Animated.View
					className="absolute inset-0 bg-black/40"
					style={overlayStyle}
				>
					<Pressable className="absolute inset-0" onPress={handleClose} />
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

					<ScrollView
						className="flex-1 px-5"
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<Text
							className="mb-4 text-[15px] leading-[22px] text-foreground dark:text-white"
							numberOfLines={4}
						>
							{highlight?.exact_text ?? ""}
						</Text>

						<View className="mb-4 flex-row gap-3">
							{HIGHLIGHT_COLORS.map((color) => (
								<Pressable
									key={color}
									accessibilityLabel={`${color} 색상`}
									onPress={() => handleColorPress(color)}
									style={{ backgroundColor: HIGHLIGHT_COLOR_STYLE[color].bar }}
									className={`h-9 w-9 rounded-full ${
										highlight?.color === color
											? "border-2 border-foreground dark:border-white"
											: ""
									}`}
								/>
							))}
						</View>

						<TextInput
							value={note}
							onChangeText={setNote}
							onBlur={flushNote}
							placeholder="메모 남기기"
							placeholderTextColor={isDark ? "#666" : "#999"}
							multiline
							textAlignVertical="top"
							className="mb-4 min-h-20 rounded-lg bg-input dark:bg-neutral-800 p-3 text-[15px] text-foreground dark:text-white"
						/>

						<TouchableOpacity
							onPress={handleDeletePress}
							activeOpacity={0.7}
							className="flex-row items-center justify-center gap-2 rounded-[10px] border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 py-2.5"
						>
							<Trash2 size={16} color="#ef4444" />
							<Text className="text-sm font-semibold text-destructive">
								하이라이트 삭제
							</Text>
						</TouchableOpacity>
					</ScrollView>
				</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	);
}
